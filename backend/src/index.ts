import http from "http";
import { env, validateEnv } from "./config/env.js";
import { logger } from "./config/logger.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket/socket.js";

validateEnv();

const app = createApp();
const server = http.createServer(app);

initSocketServer(server);

server.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "Backend running");
  logger.info({ url: `http://localhost:${env.port}/api/health` }, "Health check");
  logger.info({ url: `http://localhost:${env.port}/api/docs` }, "API docs (Swagger UI)");
  logger.info({ url: `ws://localhost:${env.port}` }, "WebSocket");
});
