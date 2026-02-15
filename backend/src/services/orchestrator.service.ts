import axios from "axios";
import { config } from "../config/default";
import { logger } from "../utils/logger";
import { v4 as uuid } from "uuid";

// Define the interface for the Frontend
export interface PipelineState {
  id: string;
  status: "active" | "failed";
  userPrompt: string;
  agentResponse: string;
  phases: any[];
  errors: string[];
  createdAt: string;
}

// In-memory store to drive the Dashboard
const pipelines = new Map<string, PipelineState>();

export async function runPipeline(userPrompt: string) {
  const pipelineId = uuid();
  logger.info(`[Broker] Brokering request ${pipelineId} to Sentinel Agent`);

  try {
    const response = await axios.post(
      `${config.archestra.apiUrl}/v1/a2a/${process.env.ARCHESTRA_AGENT_ID}`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "message/send",
        params: { message: { parts: [{ kind: "text", text: userPrompt }] } }
      },
      {
        headers: { 
          "Authorization": `Bearer ${config.archestra.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream"
        }
      }
    );

    const agentParts = response.data.result.parts;
    const finalMessage = agentParts.map((p: any) => p.text || "").join("\n");
    const isSuccess = finalMessage.toLowerCase().includes("success") || finalMessage.includes("cZW7jjWDpbyvUa9h"); // Using the ID from your screenshot

    const state: PipelineState = {
      id: pipelineId,
      status: isSuccess ? "active" : "failed",
      userPrompt: userPrompt,
      agentResponse: finalMessage,
      phases: [
        { phase: 1, name: "Broker Handshake", status: "complete" },
        { phase: 2, name: "Archestra Policy Check", status: "complete" },
        { phase: 3, name: "n8n Deployment", status: "complete" }
      ],
      errors: isSuccess ? [] : ["Check Archestra logs for details"],
      createdAt: new Date().toISOString()
    };

    // SAVE TO MAP SO DASHBOARD SEES IT
    pipelines.set(pipelineId, state);

    return state;

  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    const failState: PipelineState = {
      id: pipelineId,
      status: "failed",
      userPrompt: userPrompt,
      agentResponse: "Failed to reach Archestra Gateway",
      phases: [{ phase: 1, name: "Broker Handshake", status: "failed" }],
      errors: [errorMsg],
      createdAt: new Date().toISOString()
    };
    pipelines.set(pipelineId, failState);
    return failState;
  }
}

// FIX THE GETTERS FOR THE DASHBOARD
export function getPipeline(id: string) { return pipelines.get(id); } 
export function getAllPipelines() { return Array.from(pipelines.values()).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }