import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async route handlers to catch errors and pass them to the error handler middleware.
 * Eliminates the need for try/catch in every async route handler.
 *
 * Usage:
 * ```typescript
 * router.get("/items", asyncHandler(async (req, res) => {
 *   const items = await db.items.findMany();
 *   res.json(items);
 * }));
 * ```
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
