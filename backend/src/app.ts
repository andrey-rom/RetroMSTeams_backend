import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { devAuth } from "./shared/middleware/dev-auth.js";
import { createApiRouter } from "./routes.js";

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors(
      env.isDev
        ? { origin: true, credentials: true }
        : { origin: env.frontendUrl, credentials: true },
    ),
  );
  app.use(express.json());

  app.use("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", devAuth, createApiRouter());

  return app;
}
