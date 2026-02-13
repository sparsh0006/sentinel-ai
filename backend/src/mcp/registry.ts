// ═══════════════════════════════════════════════════════════════
// PHASE 1 — MCP TOOL REGISTRY
// Registers and manages MCP tools available to the AI engine.
// Each tool has a schema, description, and execution handler.
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";
import { logger } from "../utils/logger";

// ── Tool Schema Definitions ───────────────────────────────────

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: "communication" | "workflow" | "monitoring";
  inputSchema: z.ZodType<any>;
  requiredPermissions: string[];
  rateLimit: { maxCalls: number; windowMs: number };
}

// ── Registered Tools ──────────────────────────────────────────

const tools: Map<string, MCPTool> = new Map();

// Tool 1: Slack send message
tools.set("slack.send_message", {
  id: "slack.send_message",
  name: "Slack Send Message",
  description: "Send a message to a Slack channel",
  category: "communication",
  inputSchema: z.object({
    channel: z.string().describe("Slack channel name or ID"),
    text: z.string().describe("Message content"),
    blocks: z.array(z.any()).optional().describe("Slack Block Kit blocks"),
  }),
  requiredPermissions: ["slack:write", "slack:channels"],
  rateLimit: { maxCalls: 60, windowMs: 60_000 },
});

// Tool 2: Email send
tools.set("email.send_email", {
  id: "email.send_email",
  name: "Email Send",
  description: "Send a personalized email to a recipient",
  category: "communication",
  inputSchema: z.object({
    to: z.string().email().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email HTML or plain text body"),
    replyTo: z.string().email().optional(),
  }),
  requiredPermissions: ["email:send"],
  rateLimit: { maxCalls: 30, windowMs: 60_000 },
});

// Tool 3: n8n create workflow
tools.set("n8n.create_workflow", {
  id: "n8n.create_workflow",
  name: "n8n Create Workflow",
  description: "Create a new workflow in n8n from JSON definition",
  category: "workflow",
  inputSchema: z.object({
    name: z.string(),
    nodes: z.array(z.any()),
    connections: z.record(z.any()),
    settings: z.record(z.any()).optional(),
  }),
  requiredPermissions: ["n8n:workflow:create"],
  rateLimit: { maxCalls: 10, windowMs: 60_000 },
});

// Tool 4: n8n activate workflow
tools.set("n8n.activate_workflow", {
  id: "n8n.activate_workflow",
  name: "n8n Activate Workflow",
  description: "Activate an existing n8n workflow by ID",
  category: "workflow",
  inputSchema: z.object({
    id: z.string().describe("n8n workflow ID"),
  }),
  requiredPermissions: ["n8n:workflow:activate"],
  rateLimit: { maxCalls: 20, windowMs: 60_000 },
});

// Tool 5: n8n get executions
tools.set("n8n.get_executions", {
  id: "n8n.get_executions",
  name: "n8n Get Executions",
  description: "Retrieve execution history for a workflow",
  category: "monitoring",
  inputSchema: z.object({
    workflowId: z.string(),
    limit: z.number().default(20),
    status: z.enum(["success", "error", "waiting", "running"]).optional(),
  }),
  requiredPermissions: ["n8n:execution:read"],
  rateLimit: { maxCalls: 60, windowMs: 60_000 },
});

// ── Registry API ──────────────────────────────────────────────

export const MCPRegistry = {
  getTool(id: string): MCPTool | undefined {
    return tools.get(id);
  },

  getAllTools(): MCPTool[] {
    return Array.from(tools.values());
  },

  getToolsByCategory(category: MCPTool["category"]): MCPTool[] {
    return this.getAllTools().filter((t) => t.category === category);
  },

  validateInput(toolId: string, input: unknown): { valid: boolean; error?: string } {
    const tool = tools.get(toolId);
    if (!tool) return { valid: false, error: `Tool "${toolId}" not found` };

    const result = tool.inputSchema.safeParse(input);
    if (!result.success) {
      return { valid: false, error: result.error.message };
    }
    return { valid: true };
  },

  /** Returns tool descriptions for LLM system prompt injection */
  getToolDescriptionsForLLM(): string {
    return this.getAllTools()
      .map(
        (t) =>
          `- ${t.id}: ${t.description} [category: ${t.category}]`
      )
      .join("\n");
  },

  registerTool(tool: MCPTool): void {
    tools.set(tool.id, tool);
    logger.info(`MCP Tool registered: ${tool.id}`);
  },
};