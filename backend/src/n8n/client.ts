// ═══════════════════════════════════════════════════════════════
// PHASE 7 — n8n CLIENT
// Communicates with n8n REST API for workflow management.
// Handles create, activate, deactivate, get executions.
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosInstance } from "axios";
import { config } from "../config/default";
import { logger } from "../utils/logger";

class N8NService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.n8n.host,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.n8n.apiKey,
      },
      timeout: 15000,
    });
  }

  /**
   * Create a new workflow in n8n
   */
  async createWorkflow(workflowData: {
    name: string;
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
  }): Promise<{ id: string; name: string; active: boolean }> {
    try {
      const response = await this.http.post("/api/v1/workflows", {
        name: workflowData.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings || { saveManualExecutions: true },
      });

      logger.info(`n8n workflow created: ${response.data.id}`);
      return {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active,
      };
    } catch (error: any) {
      logger.error(`n8n create workflow failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate a workflow by ID
   */
  async activateWorkflow(id: string): Promise<{ id: string; active: boolean }> {
    try {
      const response = await this.http.patch(`/api/v1/workflows/${id}`, {
        active: true,
      });

      logger.info(`n8n workflow activated: ${id}`);
      return { id, active: response.data.active };
    } catch (error: any) {
      logger.error(`n8n activate workflow failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string): Promise<void> {
    await this.http.patch(`/api/v1/workflows/${id}`, { active: false });
    logger.info(`n8n workflow deactivated: ${id}`);
  }

  /**
   * Get execution history for a workflow (PHASE 9: Monitoring)
   */
  async getExecutions(
    workflowId: string,
    limit = 20
  ): Promise<{
    data: ExecutionRecord[];
    summary: ExecutionSummary;
  }> {
    try {
      const response = await this.http.get("/api/v1/executions", {
        params: { workflowId, limit },
      });

      const executions: ExecutionRecord[] = (response.data.data || []).map(
        (exec: any) => ({
          id: exec.id,
          workflowId: exec.workflowId,
          status: exec.finished ? (exec.stoppedAt ? "success" : "error") : "running",
          startedAt: exec.startedAt,
          finishedAt: exec.stoppedAt,
          mode: exec.mode,
          error: exec.data?.resultData?.error?.message,
        })
      );

      const summary: ExecutionSummary = {
        total: executions.length,
        success: executions.filter((e) => e.status === "success").length,
        error: executions.filter((e) => e.status === "error").length,
        running: executions.filter((e) => e.status === "running").length,
        lastExecution: executions[0] || null,
      };

      return { data: executions, summary };
    } catch (error: any) {
      logger.error(`n8n get executions failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single workflow by ID
   */
  async getWorkflow(id: string): Promise<any> {
    const response = await this.http.get(`/api/v1/workflows/${id}`);
    return response.data;
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<any[]> {
    const response = await this.http.get("/api/v1/workflows");
    return response.data.data || [];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get("/api/v1/workflows?limit=1");
      return true;
    } catch {
      return false;
    }
  }
}

// ── Types ─────────────────────────────────────────────────────

interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: "success" | "error" | "running";
  startedAt: string;
  finishedAt?: string;
  mode: string;
  error?: string;
}

interface ExecutionSummary {
  total: number;
  success: number;
  error: number;
  running: number;
  lastExecution: ExecutionRecord | null;
}

export const N8NClient = new N8NService();