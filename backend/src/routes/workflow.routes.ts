import { Router, Request, Response, NextFunction } from "express";
import {
  runPipeline,
  getPipeline,
  getAllPipelines,
} from "../services/orchestrator.service";

const router = Router();

// ── POST /api/workflows — Run full pipeline via Archestra Broker ──
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    // This now calls the Archestra A2A Agent
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

// ── GET /api/tools — List tools (Now managed by Archestra) ───
router.get("/tools/list", (_req: Request, res: Response) => {
  res.json({ 
    success: true, 
    data: [], 
    message: "Tools are now dynamically brokered via Archestra MCP Gateway." 
  });
});

// ── GET /api/health — System health check ────────────────────
router.get("/health/status", async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      server: true,
      governance: "Archestra Broker Active",
      orchestrator: "n8n Connected",
      gateway: !!process.env.ARCHESTRA_GATEWAY_URL
    },
  });
});

export default router;