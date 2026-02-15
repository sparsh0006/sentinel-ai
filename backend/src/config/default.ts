import dotenv from "dotenv";

dotenv.config();

function required(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  openai: {
    apiKey: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o",
  },

  n8n: {
    host: process.env.N8N_HOST || "http://localhost:5678",
    apiKey: process.env.N8N_API_KEY || "",
  },

  archestra: {
    apiUrl: process.env.ARCHESTRA_API_URL || "http://localhost:9000",
    apiKey: required("ARCHESTRA_API_KEY", process.env.ARCHESTRA_API_KEY),
    agentId: required("ARCHESTRA_AGENT_ID", process.env.ARCHESTRA_AGENT_ID),
    gatewayUrl: process.env.ARCHESTRA_GATEWAY_URL || "",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
} as const;