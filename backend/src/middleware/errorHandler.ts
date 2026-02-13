import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  statusCode: number;
  phase: string;

  constructor(message: string, statusCode = 500, phase = "unknown") {
    super(message);
    this.statusCode = statusCode;
    this.phase = phase;
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const phase = err instanceof AppError ? err.phase : "unknown";

  logger.error(`[Phase: ${phase}] ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    error: err.message,
    phase,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}