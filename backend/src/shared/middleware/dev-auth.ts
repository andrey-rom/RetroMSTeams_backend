import type { Request, Response, NextFunction } from "express";

export function devAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"];

  if (!userId || typeof userId !== "string") {
    res.status(401).json({ error: "Missing x-user-id header" });
    return;
  }

  req.userId = userId;
  next();
}
