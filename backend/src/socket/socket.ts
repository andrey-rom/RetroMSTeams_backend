import { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../shared/errors/app-error.js";
import { getSocketUserId } from "../shared/middleware/auth.js";
import { registerSessionHandlers } from "./handlers/session.handler.js";

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.isDev ? true : env.frontendUrl,
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    const authToken = socket.handshake.auth.token as string | undefined;

    let userId: string;
    try {
      userId = getSocketUserId(authToken);
    } catch (error) {
      const code =
        error instanceof AppError ? error.code : "UNAUTHORIZED";
      logger.warn({ socketId: socket.id, code }, "Socket rejected");
      socket.disconnect(true);
      return;
    }

    logger.debug({ socketId: socket.id, userId }, "Socket connected");

    registerSessionHandlers(socket);

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
