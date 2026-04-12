import { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { registerSessionHandlers } from "./handlers/session.handler.js";
import { emitActiveUsers } from "./emitters/board.emitter.js";
import * as presence from "./session-presence.js";

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.isDev ? true : env.allowedOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    logger.debug({ socketId: socket.id, userId }, "Socket connected");

    registerSessionHandlers(socket);

    socket.on("disconnect", () => {
      const affected = presence.removeSocketFromAll(socket.id, userId);
      for (const sessionId of affected) {
        emitActiveUsers(sessionId, presence.getActiveUserCount(sessionId));
      }
      logger.debug({ socketId: socket.id, userId }, "Socket disconnected");
    });
  });

  return io;
}
