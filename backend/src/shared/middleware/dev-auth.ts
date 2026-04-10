import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight auth middleware for development / POC.
 *
 * Reads `x-user-id` from request headers and attaches it to `req.userId`.
 * Returns 401 if the header is missing.
 *
 * When real Azure AD auth is added, replace this middleware — everything
 * downstream (ownerHash, card ownership) stays unchanged because it only
 * depends on `req.userId`.
 */
export function devAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"];

  if (!userId || typeof userId !== "string") {
    res.status(401).json({ error: "Missing x-user-id header" });
    return;
  }

  req.userId = userId;
  next();
}
