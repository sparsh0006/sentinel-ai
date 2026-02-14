import { ArchestraClient } from "../archestra/client";
import { logger } from "../utils/logger";
import { AppError } from "../middleware/errorHandler";
import { v4 as uuid } from "uuid";
import axios from "axios";
import { config } from "../config/default";

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
  async execute(
    toolId: string,
    args: Record<string, any>
  ): Promise<ToolCallResult> {
    const callId = uuid();
    const start = Date.now();
    const timestamp = new Date().toISOString();

    logger.info(`[MCP Broker] Brokering tool: ${toolId}`, { callId, args });

    try {
      // Step 1: Delegate Execution to Archestra Gateway
      // Archestra handles authentication, policy, and routing to the actual MCP server
      const gatewayUrl = process.env.ARCHESTRA_GATEWAY_URL;
      if (!gatewayUrl) throw new Error("ARCHESTRA_GATEWAY_URL not configured");

            const response = await axios.post(gatewayUrl, {
        jsonrpc: "2.0",
        id: callId,
        method: "tools/call",
        params: {
          name: toolId,
          arguments: args
        }
      }, {
        headers: { 
          "Authorization": `Bearer ${config.archestra.apiKey}`,
          "Content-Type": "application/json",
          // ADD THIS LINE BELOW
          "Accept": "application/json, text/event-stream" 
        }
      });

      const data = response.data;
      
      // Check if Archestra returned an error or blocked result
      if (data.error) {
        return {
          callId, toolId, status: "error",
          error: data.error.message,
          durationMs: Date.now() - start, timestamp,
        };
      }

      logger.info(`[MCP Broker] Tool ${toolId} executed via Gateway`, { callId });
      
      return {
        callId, toolId, status: "success",
        policyVerdict: "ALLOWED",
        result: data.result,
        durationMs: Date.now() - start, timestamp,
      };

    } catch (err: any) {
      logger.error(`[MCP Broker] Execution failed for ${toolId}`, { error: err.message });
      return {
        callId, toolId, status: "error",
        error: err.response?.data?.message || err.message,
        durationMs: Date.now() - start, timestamp,
      };
    }
  },
};