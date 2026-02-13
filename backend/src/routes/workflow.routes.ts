import { Router, Request, Response, NextFunction } from "express";
import {
  runPipeline,
  getPipeline,
  getAllPipelines,
  approvePipeline,
  analyzeFailure,
} from "../services/orchestrator.service";
import { MCPRegistry } from "../mcp/registry";
import { ArchestraClient } from "../archestra/client";
import { N8NClient } from "../n8n/client";

const router = Router();

// ── POST /api/workflows — Run full pipeline ──────────────────
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    const result = await runPipeline(prompt);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/workflows — List all pipelines ──────────────────
router.get("/", (_req: Request, res: Response) => {
  const pipelines = getAllPipelines();
  res.json({ success: true, data: pipelines });
});

// ── GET /api/workflows/:id — Get pipeline state ──────────────
router.get("/:id", (req: Request, res: Response) => {
  const pipeline = getPipeline(req.params.id);
  if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
  res.json({ success: true, data: pipeline });
});

// ── POST /api/workflows/:id/approve — Manual approval ────────
router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await approvePipeline(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/workflows/:id/diagnose — Failure analysis ───────
router.get("/:id/diagnose", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await analyzeFailure(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/tools — List registered MCP tools ───────────────
router.get("/tools/list", (_req: Request, res: Response) => {
  res.json({ success: true, data: MCPRegistry.getAllTools().map((t) => ({
    id: t.id, name: t.name, category: t.category, description: t.description,
  })) });
});

// ── GET /api/health — System health check ────────────────────
router.get("/health/status", async (_req: Request, res: Response) => {
  const [archestra, n8n] = await Promise.all([
    ArchestraClient.healthCheck(),
    N8NClient.healthCheck(),
  ]);

  res.json({
    success: true,
    data: {
      server: true,
      archestra,
      n8n,
      tools: MCPRegistry.getAllTools().length,
    },
  });
});

export default router;