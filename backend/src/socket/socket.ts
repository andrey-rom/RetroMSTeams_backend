import { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
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
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    console.log(`[socket] connected: ${socket.id} (user: ${userId})`);

    registerSessionHandlers(socket);

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  return io;
}
