import { MCPRegistry } from "./registry";
import { ArchestraClient } from "../archestra/client";
import { N8NClient } from "../n8n/client";
import { logger } from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { v4 as uuid } from "uuid";

export interface ToolCallResult {
  callId: string;
  toolId: string;
  status: "success" | "blocked" | "error" | "pending_approval";
  policyVerdict?: string;
  result?: any;
  error?: string;
  durationMs: number;
  timestamp: string;
}

export const MCPExecutor = {
  /**
   * Execute a tool call through the full pipeline:
   * 1. Validate input schema
   * 2. Check Archestra policies
   * 3. Execute tool
   * 4. Return result with audit metadata
   */
  async execute(
    toolId: string,
    args: Record<string, any>
  ): Promise<ToolCallResult> {
    const callId = uuid();
    const start = Date.now();
    const timestamp = new Date().toISOString();

    logger.info(`[MCP] Executing tool: ${toolId}`, { callId, args });

    // ── Step 1: Validate input ──────────────────────────
    const validation = MCPRegistry.validateInput(toolId, args);
    if (!validation.valid) {
      return {
        callId, toolId, status: "error",
        error: `Input validation failed: ${validation.error}`,
        durationMs: Date.now() - start, timestamp,
      };
    }

    // ── Step 2: Archestra Policy Check ──────────────────
    try {
      const policyResult = await ArchestraClient.evaluatePolicy(toolId, args);

      if (policyResult.decision === "DENIED") {
        logger.warn(`[MCP] Policy DENIED for ${toolId}`, { reason: policyResult.reason });
        return {
          callId, toolId, status: "blocked",
          policyVerdict: "DENIED",
          error: policyResult.reason,
          durationMs: Date.now() - start, timestamp,
        };
      }

      if (policyResult.decision === "REQUIRES_APPROVAL") {
        logger.info(`[MCP] Tool ${toolId} requires admin approval`);
        return {
          callId, toolId, status: "pending_approval",
          policyVerdict: "REQUIRES_APPROVAL",
          durationMs: Date.now() - start, timestamp,
        };
      }
    } catch (err) {
      // If Archestra is unreachable, use local policy fallback
      logger.warn(`[MCP] Archestra unreachable, using local policy fallback`);
      const localCheck = localPolicyFallback(toolId, args);
      if (!localCheck.allowed) {
        return {
          callId, toolId, status: "blocked",
          policyVerdict: "LOCAL_DENIED",
          error: localCheck.reason,
          durationMs: Date.now() - start, timestamp,
        };
      }
    }

    // ── Step 3: Execute Tool ────────────────────────────
    try {
      const result = await routeToolExecution(toolId, args);
      logger.info(`[MCP] Tool ${toolId} executed successfully`, { callId });
      return {
        callId, toolId, status: "success",
        policyVerdict: "ALLOWED",
        result,
        durationMs: Date.now() - start, timestamp,
      };
    } catch (err: any) {
      logger.error(`[MCP] Tool ${toolId} execution failed`, { error: err.message });
      return {
        callId, toolId, status: "error",
        policyVerdict: "ALLOWED",
        error: err.message,
        durationMs: Date.now() - start, timestamp,
      };
    }
  },
};

// ── Route tool execution to correct client ────────────────────
async function routeToolExecution(toolId: string, args: Record<string, any>) {
  switch (toolId) {
    case "slack.send_message":
      // In production, this calls Slack API via MCP.
      // For MVP, simulated or routed through n8n Slack node.
      logger.info(`[Slack] Sending to #${args.channel}: ${args.text}`);
      return { sent: true, channel: args.channel, ts: Date.now() };

    case "email.send_email":
      logger.info(`[Email] Sending to ${args.to}: ${args.subject}`);
      return { sent: true, to: args.to, messageId: uuid() };

    case "n8n.create_workflow":
      return await N8NClient.createWorkflow({
        name: args.name,
        nodes: args.nodes,
        connections: args.connections,
        settings: args.settings,
      });

    case "n8n.activate_workflow":
      return await N8NClient.activateWorkflow(args.id);

    case "n8n.get_executions":
      return await N8NClient.getExecutions(args.workflowId, args.limit);

    default:
      throw new AppError(`Unknown tool: ${toolId}`, 400, "execution");
  }
}

// ── Local fallback policies (when Archestra is offline) ───────
function localPolicyFallback(
  toolId: string,
  args: Record<string, any>
): { allowed: boolean; reason?: string } {
  // Basic rate limit & allow-list checks
  if (toolId === "email.send_email") {
    const blockedDomains = ["competitor.com", "spam.com"];
    const domain = args.to?.split("@")[1];
    if (blockedDomains.includes(domain)) {
      return { allowed: false, reason: `Email domain "${domain}" is blocked` };
    }
  }

  if (toolId === "slack.send_message") {
    const blockedChannels = ["#random", "#general"];
    if (blockedChannels.includes(args.channel)) {
      return { allowed: false, reason: `Channel "${args.channel}" requires approval` };
    }
  }

  return { allowed: true };
}