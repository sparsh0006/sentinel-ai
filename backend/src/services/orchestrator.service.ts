import axios from "axios";
import { config } from "../config/default";
import { logger } from "../utils/logger";
import { v4 as uuid } from "uuid";

export async function runPipeline(userPrompt: string) {
  const pipelineId = uuid();
  logger.info(`[Broker] Brokering request ${pipelineId} to Sentinel Agent: ${config.archestra.agentId}`);

  try {
    // 1. Call the Archestra A2A API
    const response = await axios.post(
      `${config.archestra.apiUrl}/v1/a2a/${config.archestra.agentId}`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "message/send",
        params: {
          message: {
            parts: [{ kind: "text", text: userPrompt }]
          }
        }
      },
      {
        headers: { 
          "Authorization": `Bearer ${config.archestra.apiKey}`,
          "Content-Type": "application/json",
          // CRITICAL: Required for Archestra Gateway communication
          "Accept": "application/json, text/event-stream" 
        }
      }
    );

    // 2. Defensive Check: Handle error responses from Archestra
    if (!response.data || response.data.error) {
      const errorMsg = response.data?.error?.message || "Unknown Archestra Error";
      throw new Error(errorMsg);
    }

    // 3. Extract the text response from the Agent
    const result = response.data.result;
    if (!result || !result.parts) {
      throw new Error("Agent failed to generate a response. Please check Archestra Agent logs.");
    }

    const finalMessage = result.parts.map((p: any) => p.text || "").join("\n");
    
    // 4. Success Detection: Did the agent actually build the workflow?
    // We look for common success markers in the AI's response text
    const isSuccess = 
        finalMessage.toLowerCase().includes("success") || 
        finalMessage.includes("ID:") || 
        finalMessage.toLowerCase().includes("deployed");

    logger.info(`[Broker] Agent responded. Success status: ${isSuccess}`);

    return {
      id: pipelineId,
      status: isSuccess ? "active" : "failed",
      userPrompt: userPrompt,
      agentResponse: finalMessage,
      phases: [
        { phase: 1, name: "Broker Handshake", status: "complete" },
        { phase: 2, name: "Governed Reasoning", status: "complete" },
        { phase: 3, name: "MCP Tool Execution", status: isSuccess ? "complete" : "failed" },
        { phase: 4, name: "n8n Deployment", status: isSuccess ? "complete" : "failed" }
      ],
      errors: isSuccess ? [] : ["The Agent responded, but could not confirm successful deployment in n8n."],
      createdAt: new Date().toISOString()
    };

  } catch (error: any) {
    const errorDetail = error.response?.data?.error?.message || error.message;
    logger.error(`[Broker] Pipeline ${pipelineId} failed: ${errorDetail}`);
    
    return {
      id: pipelineId,
      status: "failed",
      errors: [errorDetail],
      phases: [
        { phase: 1, name: "Broker Handshake", status: "failed", details: errorDetail }
      ],
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * These stubs keep the Frontend's "Workflows" list from breaking.
 * In a full production app, you would save the 'pipelineId' to a database (Redis/Postgres)
 */
export function getPipeline(id: string) { return undefined; } 
export function getAllPipelines() { return []; }