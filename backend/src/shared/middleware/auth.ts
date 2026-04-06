import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../../config/env.js";
import { verifyAppToken } from "../../modules/auth/auth.service.js";

function extractBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null;

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const devUserId = req.headers["x-user-id"];
    if (env.isDev && typeof devUserId === "string" && devUserId.length > 0) {
      req.userId = devUserId;
      next();
      return;
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError("Missing bearer token", 401, "UNAUTHORIZED");
    }

    const payload = verifyAppToken(token);
    req.userId = payload.oid;
    next();
  } catch (error) {
    const err =
      error instanceof AppError
        ? error
        : new AppError("Invalid or expired bearer token", 401, "UNAUTHORIZED");

    res.status(err.statusCode);
    await res.json({ error: err.message, code: err.code });
  }
}

export function getSocketUserId(token?: string): string {
  if (env.isDev && token && !token.includes(".")) {
    return token;
  }

  if (!token) {
    throw new AppError("Missing socket auth token", 401, "UNAUTHORIZED");
  }

  return verifyAppToken(token).oid;
}
