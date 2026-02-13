// ═══════════════════════════════════════════════════════════════
// PHASE 3 — INTENT PARSING SERVICE
// Uses LLM to extract structured intent from natural language.
// Output: trigger, conditions, actions, parameters
// ═══════════════════════════════════════════════════════════════

import OpenAI from "openai";
import { config } from "../config/default";
import { MCPRegistry } from "../mcp/registry";
import { logger } from "../utils/logger";

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface ParsedIntent {
  trigger: "webhook" | "schedule" | "event" | "manual";
  conditions: { field: string; operator: string; value: any }[];
  actions: {
    toolId: string;
    args: Record<string, any>;
    order: number;
  }[];
  metadata: {
    confidence: number;
    rawPrompt: string;
    parsedAt: string;
  };
}

export async function parseIntent(userPrompt: string): Promise<ParsedIntent> {
  const toolDescriptions = MCPRegistry.getToolDescriptionsForLLM();

  const systemPrompt = `You are an AI workflow architect. Given a user's natural language instruction, extract a structured workflow intent.

Available MCP Tools:
${toolDescriptions}

Respond ONLY with valid JSON matching this schema:
{
  "trigger": "webhook" | "schedule" | "event" | "manual",
  "conditions": [{ "field": "string", "operator": ">|<|==|!=|>=|<=|contains", "value": "any" }],
  "actions": [{ "toolId": "exact.tool.id", "args": { ... }, "order": 1 }],
  "confidence": 0.0 to 1.0
}

Rules:
- Map user intent to the closest available MCP tools
- Infer reasonable default args from context (e.g., #sales channel for sales notifications)
- Use webhook trigger for form-based inputs
- Set conditions based on lead scoring, values, or thresholds mentioned
- Order actions logically (notify first, then email)
- Be precise with tool IDs — they must match exactly`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(content);

    logger.info(`Intent parsed with confidence: ${parsed.confidence}`, {
      trigger: parsed.trigger,
      actionCount: parsed.actions?.length,
    });

    return {
      trigger: parsed.trigger || "webhook",
      conditions: parsed.conditions || [],
      actions: (parsed.actions || []).map((a: any, i: number) => ({
        toolId: a.toolId,
        args: a.args || {},
        order: a.order || i + 1,
      })),
      metadata: {
        confidence: parsed.confidence || 0.5,
        rawPrompt: userPrompt,
        parsedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    logger.error(`Intent parsing failed: ${error.message}`);
    throw error;
  }
}