import { Router, Request, Response, NextFunction } from "express";
import { N8NClient } from "../n8n/client";

const router = Router();

// ── GET /api/monitoring/executions/:workflowId ───────────────
router.get(
  "/executions/:workflowId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await N8NClient.getExecutions(workflowId, limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/monitoring/workflows ────────────────────────────
router.get("/workflows", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const workflows = await N8NClient.listWorkflows();
    res.json({
      success: true,
      data: workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;