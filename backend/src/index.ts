import http from "http";
import { env, validateEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket/socket.js";

validateEnv();

const app = createApp();
const server = http.createServer(app);

initSocketServer(server);

server.listen(env.port, () => {
  console.log(`[retro-bot] Backend running on http://localhost:${env.port}`);
  console.log(`[retro-bot] Health check: http://localhost:${env.port}/api/health`);
  console.log(`[retro-bot] WebSocket: ws://localhost:${env.port}`);
  console.log(`[retro-bot] Environment: ${env.nodeEnv}`);
});
