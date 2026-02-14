import express from "express";
import cors from "cors";
import { config } from "./config/default";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import workflowRoutes from "./routes/workflow.routes";
import monitoringRoutes from "./routes/monitoring.routes";

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3001", "http://localhost:3000"] }));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/workflows", workflowRoutes);
app.use("/api/monitoring", monitoringRoutes);

// ── Root ──────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    service: "AI Automation Architect",
    version: "1.0.0",
    status: "Governed via Archestra",
    endpoints: [
      "POST /api/workflows          — Run pipeline from prompt",
      "GET  /api/workflows           — List all pipelines",
      "GET  /api/workflows/:id       — Get pipeline state",
      "POST /api/workflows/:id/approve — Approve pending pipeline",
      "GET  /api/workflows/:id/diagnose — Diagnose failure",
      "GET  /api/workflows/tools/list — List MCP tools",
      "GET  /api/workflows/health/status — Health check",
      "GET  /api/monitoring/executions/:wfId — Execution logs",
      "GET  /api/monitoring/workflows — List n8n workflows",
    ],
  });
});

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`🏗  AI Automation Architect running on http://localhost:${config.port}`);
  logger.info(`🔗 Archestra Gateway: ${process.env.ARCHESTRA_GATEWAY_URL}`);
  logger.info(`🔗 n8n: ${config.n8n.host}`);
});

export default app;