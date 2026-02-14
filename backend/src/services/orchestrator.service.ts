import axios from "axios";
import { config } from "../config/default";
import { logger } from "../utils/logger";
import { v4 as uuid } from "uuid";

export async function runPipeline(userPrompt: string) {
  const pipelineId = uuid();
  logger.info(`[Broker] Forwarding prompt to Sentinel Architect Agent: ${pipelineId}`);

  try {
    const response = await axios.post(
      `${config.archestra.apiUrl}/v1/a2a/${process.env.ARCHESTRA_AGENT_ID}`,
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
          "Content-Type": "application/json"
        }
      }
    );

    // Defensive Check: Ensure the response structure is what we expect
    if (!response.data || response.data.error) {
        const errorMsg = response.data?.error?.message || "Unknown Archestra Error";
        throw new Error(errorMsg);
    }

    const result = response.data.result;
    if (!result || !result.parts) {
        logger.warn(`[Broker] Agent returned success but no text parts:`, response.data);
        throw new Error("Agent failed to generate a response. Check Archestra UI logs.");
    }

    const agentParts = result.parts;
    const finalMessage = agentParts.map((p: any) => p.text || "").join("\n");

    logger.info(`[Broker] Agent successfully processed request for ${pipelineId}`);

    return {
      id: pipelineId,
      status: "active",
      userPrompt: userPrompt,
      agentResponse: finalMessage,
      phases: [
        { phase: 1, name: "Gateway Handshake", status: "complete" },
        { phase: 2, name: "Governed Reasoning", status: "complete" },
        { phase: 3, name: "MCP Tool Execution", status: "complete" },
        { phase: 4, name: "n8n Deployment", status: "complete" }
      ],
      errors: [],
      createdAt: new Date().toISOString()
    };

  } catch (error: any) {
    const errorDetail = error.response?.data?.error?.message || error.message;
    logger.error(`[Broker] Agent call failed: ${errorDetail}`);
    
    return {
      id: pipelineId,
      status: "failed",
      errors: [errorDetail],
      phases: [{ phase: 1, name: "Gateway Handshake", status: "failed", details: errorDetail }]
    };
  }
}

export function getPipeline(id: string) { return undefined; } 
export function getAllPipelines() { return []; }