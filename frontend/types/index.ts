// ═══════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════

export interface PipelineState {
  id: string;
  status: "parsing" | "blueprint" | "policy_check" | "awaiting_approval" | "deploying" | "active" | "failed";
  userPrompt: string;
  intent?: ParsedIntent;
  blueprint?: WorkflowBlueprint;
  policyResults: { toolId: string; result: any }[];
  deploymentResult?: { workflowId: string; webhookUrl?: string };
  monitoring?: any;
  errors: string[];
  phases: PhaseLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ParsedIntent {
  trigger: string;
  conditions: { field: string; operator: string; value: any }[];
  actions: { toolId: string; args: Record<string, any>; order: number }[];
  metadata: { confidence: number; rawPrompt: string; parsedAt: string };
}

export interface WorkflowBlueprint {
  id: string;
  trigger: string;
  condition: string;
  steps: BlueprintStep[];
  errorHandling: { retries: number; onFailure: string };
  n8nWorkflow: any;
  createdAt: string;
}

export interface BlueprintStep {
  order: number;
  tool: string;
  args: Record<string, any>;
  policyStatus: "pending" | "allowed" | "denied" | "requires_approval";
}

export interface PhaseLog {
  phase: number;
  name: string;
  status: "pending" | "running" | "complete" | "failed" | "skipped";
  durationMs?: number;
  details?: any;
}

export interface MCPTool {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface HealthStatus {
  server: boolean;
  archestra: boolean;
  n8n: boolean;
  tools: number;
}