import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";
import { logger } from "../../config/logger.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
