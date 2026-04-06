import http from "http";
import { env, validateEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket/socket.js";
import * as timerManager from "./shared/utils/timer-manager.js";
import { emitTimerExpired, emitCollectGrace } from "./socket/emitters/board.emitter.js";
import * as sessionsRepo from "./modules/sessions/sessions.repository.js";

validateEnv();

const app = createApp();
const server = http.createServer(app);

initSocketServer(server);

server.listen(env.port, async () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "Backend running");
  logger.info({ url: `http://localhost:${env.port}/api/health` }, "Health check");
  logger.info({ url: `http://localhost:${env.port}/api/docs` }, "API docs (Swagger UI)");
  logger.info({ url: `ws://localhost:${env.port}` }, "WebSocket");

  await timerManager.restoreAll(async (sessionId, phase) => {
    if (phase === "collect") {
      const graceAt = new Date();
      await sessionsRepo.setCollectGraceAt(sessionId, graceAt);
      emitCollectGrace(sessionId, graceAt);
    } else {
      await sessionsRepo.setTimerExpiresAt(sessionId, null);
      emitTimerExpired(sessionId);
    }
  });
});
