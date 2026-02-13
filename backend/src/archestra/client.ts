// ═══════════════════════════════════════════════════════════════
// PHASE 5 — ARCHESTRA CLIENT
// Interfaces with Archestra Platform API for policy evaluation,
// tool governance, and audit logging.
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosInstance } from "axios";
import { config } from "../config/default";
import { logger } from "../utils/logger";

export interface PolicyResult {
  decision: "ALLOWED" | "DENIED" | "REQUIRES_APPROVAL";
  reason: string;
  policyId?: string;
  conditions?: string[];
}

class ArchestraService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.archestra.apiUrl,
      headers: {
        "Content-Type": "application/json",
        ...(config.archestra.apiKey && {
          Authorization: `Bearer ${config.archestra.apiKey}`,
        }),
      },
      timeout: 5000,
    });
  }

  /**
   * Evaluate a tool call against Archestra's policy engine.
   * Archestra checks:
   *  - Is the tool allowed for this org/team/agent?
   *  - Rate limits
   *  - Data classification rules
   *  - Prompt injection scanning on args
   */
  async evaluatePolicy(
    toolId: string,
    args: Record<string, any>
  ): Promise<PolicyResult> {
    try {
      const response = await this.http.post("/api/v1/policy/evaluate", {
        tool_id: toolId,
        arguments: args,
        context: {
          agent: "ai-automation-architect",
          timestamp: new Date().toISOString(),
        },
      });

      return {
        decision: response.data.decision,
        reason: response.data.reason || "Policy check passed",
        policyId: response.data.policy_id,
        conditions: response.data.conditions,
      };
    } catch (error: any) {
      // If Archestra returns a structured denial
      if (error.response?.status === 403) {
        return {
          decision: "DENIED",
          reason: error.response.data?.reason || "Access denied by policy",
        };
      }

      // If Archestra is unreachable, throw to trigger local fallback
      logger.warn(
        `Archestra policy evaluation failed: ${error.message}. Using local fallback.`
      );
      throw error;
    }
  }

  /**
   * Register a tool with Archestra's MCP registry
   */
  async registerTool(tool: {
    id: string;
    name: string;
    description: string;
    schema: any;
  }): Promise<void> {
    try {
      await this.http.post("/api/v1/mcp/tools", tool);
      logger.info(`Tool registered in Archestra: ${tool.id}`);
    } catch (error: any) {
      logger.error(`Failed to register tool ${tool.id}: ${error.message}`);
    }
  }

  /**
   * Log an audit event for tool execution
   */
  async logAuditEvent(event: {
    toolId: string;
    callId: string;
    status: string;
    durationMs: number;
    error?: string;
  }): Promise<void> {
    try {
      await this.http.post("/api/v1/audit/events", {
        ...event,
        agent: "ai-automation-architect",
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Audit logging failure should not block execution
      logger.warn(`Audit log failed for call ${event.callId}`);
    }
  }

  /**
   * Health check for Archestra platform
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.http.get("/health");
      return res.status === 200;
    } catch {
      return false;
    }
  }
}

export const ArchestraClient = new ArchestraService();