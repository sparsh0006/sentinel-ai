import { parseIntent, ParsedIntent } from "./intent.service";
import { generateBlueprint, WorkflowBlueprint } from "./blueprint.service";
import { MCPExecutor, ToolCallResult } from "../mcp/executor";
import { ArchestraClient } from "../archestra/client";
import { N8NClient } from "../n8n/client";
import { logger } from "../utils/logger";
import { v4 as uuid } from "uuid";

// ── Pipeline State ────────────────────────────────────────────

export interface PipelineState {
  id: string;
  status: "parsing" | "blueprint" | "policy_check" | "awaiting_approval" | "deploying" | "active" | "failed";
  userPrompt: string;
  intent?: ParsedIntent;
  blueprint?: WorkflowBlueprint;
  policyResults: { toolId: string; result: ToolCallResult }[];
  deploymentResult?: { workflowId: string; webhookUrl?: string };
  monitoring?: any;
  errors: string[];
  phases: PhaseLog[];
  createdAt: string;
  updatedAt: string;
}

interface PhaseLog {
  phase: number;
  name: string;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  durationMs?: number;
  details?: any;
}

// In-memory store (swap with Redis/DB in production)
const pipelines = new Map<string, PipelineState>();

// ── Main Pipeline Execution ───────────────────────────────────

export async function runPipeline(userPrompt: string): Promise<PipelineState> {
  const pipelineId = uuid();
  const state: PipelineState = {
    id: pipelineId,
    status: "parsing",
    userPrompt,
    policyResults: [],
    errors: [],
    phases: initPhases(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  pipelines.set(pipelineId, state);

  try {
    // ══ PHASE 3: Intent Parsing ═══════════════════════════
    await runPhase(state, 2, "Intent Parsing", async () => {
      state.intent = await parseIntent(userPrompt);
      state.status = "blueprint";
      return { confidence: state.intent.metadata.confidence, actions: state.intent.actions.length };
    });

    // ══ PHASE 4: Blueprint Generation ═════════════════════
    await runPhase(state, 3, "Blueprint Generation", async () => {
      state.blueprint = generateBlueprint(state.intent!);
      state.status = "policy_check";
      return { blueprintId: state.blueprint.id, steps: state.blueprint.steps.length };
    });

    // ══ PHASE 5: Policy Evaluation ════════════════════════
    await runPhase(state, 4, "Policy Evaluation", async () => {
      const results = [];
      for (const step of state.blueprint!.steps) {
        try {
          const policyResult = await ArchestraClient.evaluatePolicy(step.tool, step.args);
          step.policyStatus = policyResult.decision === "ALLOWED" ? "allowed"
            : policyResult.decision === "DENIED" ? "denied" : "requires_approval";
          results.push({ tool: step.tool, decision: policyResult.decision });
        } catch {
          // Archestra offline — local fallback already in MCPExecutor
          step.policyStatus = "allowed";
          results.push({ tool: step.tool, decision: "ALLOWED (local fallback)" });
        }
      }
      return results;
    });

    // ══ PHASE 6: Approval Flow ════════════════════════════
    await runPhase(state, 5, "Approval Flow", async () => {
      const needsApproval = state.blueprint!.steps.some(
        (s) => s.policyStatus === "requires_approval"
      );
      if (needsApproval) {
        state.status = "awaiting_approval";
        return { requiresApproval: true, message: "Admin approval needed" };
      }

      const hasDenied = state.blueprint!.steps.some(
        (s) => s.policyStatus === "denied"
      );
      if (hasDenied) {
        state.status = "failed";
        const deniedSteps = state.blueprint!.steps.filter((s) => s.policyStatus === "denied");
        throw new Error(`Policy denied for: ${deniedSteps.map((s) => s.tool).join(", ")}`);
      }

      return { approved: true };
    });

    // Skip deploy if awaiting approval
    if (state.status === "awaiting_approval") {
      pipelines.set(pipelineId, state);
      return state;
    }

    // ══ PHASE 7: Deploy to n8n ════════════════════════════
    await runPhase(state, 6, "Deploy to n8n", async () => {
      state.status = "deploying";

      // Create workflow
      const created = await MCPExecutor.execute("n8n.create_workflow", {
        name: state.blueprint!.n8nWorkflow.name,
        nodes: state.blueprint!.n8nWorkflow.nodes,
        connections: state.blueprint!.n8nWorkflow.connections,
        settings: state.blueprint!.n8nWorkflow.settings,
      });

      if (created.status !== "success") {
        throw new Error(`Workflow creation failed: ${created.error}`);
      }

      const workflowId = created.result.id;

      // Activate workflow
      const activated = await MCPExecutor.execute("n8n.activate_workflow", {
        id: workflowId,
      });

      if (activated.status !== "success") {
        throw new Error(`Workflow activation failed: ${activated.error}`);
      }

      state.deploymentResult = {
        workflowId,
        webhookUrl: `${process.env.N8N_HOST || "http://localhost:5678"}/webhook/${state.blueprint!.n8nWorkflow.nodes[0]?.parameters?.path}`,
      };
      state.status = "active";

      return state.deploymentResult;
    });

    // ══ PHASE 9: Initial Monitoring ═══════════════════════
    await runPhase(state, 8, "Monitoring Setup", async () => {
      if (state.deploymentResult?.workflowId) {
        const execResult = await MCPExecutor.execute("n8n.get_executions", {
          workflowId: state.deploymentResult.workflowId,
          limit: 5,
        });
        state.monitoring = execResult.result;
        return { monitoring: "active" };
      }
      return { monitoring: "skipped" };
    });

  } catch (error: any) {
    state.status = "failed";
    state.errors.push(error.message);
    logger.error(`Pipeline ${pipelineId} failed: ${error.message}`);
  }

  state.updatedAt = new Date().toISOString();
  pipelines.set(pipelineId, state);
  return state;
}

// ── Phase Runner Utility ──────────────────────────────────────

async function runPhase(
  state: PipelineState,
  phaseIdx: number,
  name: string,
  fn: () => Promise<any>
): Promise<void> {
  const phase = state.phases[phaseIdx];
  phase.status = "running";
  const start = Date.now();

  try {
    const details = await fn();
    phase.status = "complete";
    phase.details = details;
    phase.durationMs = Date.now() - start;
    logger.info(`✅ Phase ${phaseIdx + 1} (${name}) completed in ${phase.durationMs}ms`);
  } catch (error: any) {
    phase.status = "failed";
    phase.durationMs = Date.now() - start;
    phase.details = { error: error.message };
    state.errors.push(`Phase ${phaseIdx + 1} (${name}): ${error.message}`);
    throw error;
  }
}

function initPhases(): PhaseLog[] {
  return [
    { phase: 1, name: "Tool Registration", status: "complete" },
    { phase: 2, name: "User Input", status: "complete" },
    { phase: 3, name: "Intent Parsing", status: "pending" },
    { phase: 4, name: "Blueprint Generation", status: "pending" },
    { phase: 5, name: "Policy Evaluation", status: "pending" },
    { phase: 6, name: "Approval Flow", status: "pending" },
    { phase: 7, name: "Deploy to n8n", status: "pending" },
    { phase: 8, name: "Runtime Execution", status: "pending" },
    { phase: 9, name: "Monitoring", status: "pending" },
    { phase: 10, name: "Failure Handling", status: "pending" },
  ];
}

// ── Pipeline State Access ─────────────────────────────────────

export function getPipeline(id: string): PipelineState | undefined {
  return pipelines.get(id);
}

export function getAllPipelines(): PipelineState[] {
  return Array.from(pipelines.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ── PHASE 6: Manual Approval ──────────────────────────────────

export async function approvePipeline(pipelineId: string): Promise<PipelineState> {
  const state = pipelines.get(pipelineId);
  if (!state) throw new Error("Pipeline not found");
  if (state.status !== "awaiting_approval") {
    throw new Error("Pipeline is not awaiting approval");
  }

  // Mark all requiring-approval steps as allowed
  state.blueprint!.steps
    .filter((s) => s.policyStatus === "requires_approval")
    .forEach((s) => (s.policyStatus = "allowed"));

  // Continue deployment
  state.status = "deploying";
  // Re-run phases 7-9...
  // (Simplified: in production this would resume the pipeline)

  state.updatedAt = new Date().toISOString();
  pipelines.set(pipelineId, state);
  return state;
}

// ── PHASE 10: Failure Analysis ────────────────────────────────

export async function analyzeFailure(
  pipelineId: string
): Promise<{ diagnosis: string; suggestion: string }> {
  const state = pipelines.get(pipelineId);
  if (!state) throw new Error("Pipeline not found");

  const failedPhases = state.phases.filter((p) => p.status === "failed");
  const errors = state.errors;

  let diagnosis = "Unknown failure";
  let suggestion = "Check logs and retry";

  if (errors.some((e) => e.includes("Policy denied"))) {
    diagnosis = "One or more tools were denied by Archestra policy engine";
    suggestion = "Review policy rules in Archestra UI, or request admin approval";
  } else if (errors.some((e) => e.includes("n8n"))) {
    diagnosis = "n8n workflow deployment or activation failed";
    suggestion = "Verify n8n is running and API key is valid. Check n8n logs.";
  } else if (errors.some((e) => e.includes("Intent"))) {
    diagnosis = "LLM could not parse the user instruction";
    suggestion = "Rephrase the instruction with clearer trigger/action language";
  }

  return { diagnosis, suggestion };
}