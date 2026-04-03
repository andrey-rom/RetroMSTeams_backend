import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { devAuth } from "./shared/middleware/dev-auth.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { createApiRouter } from "./routes.js";

export function createApp(): express.Express {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === "/api/health" || req.method === "OPTIONS",
      },
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    }),
  );

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

  app.use(errorHandler);

  return app;
}
