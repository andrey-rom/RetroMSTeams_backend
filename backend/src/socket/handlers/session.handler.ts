import type { Socket } from "socket.io";
import { logger } from "../../config/logger.js";

export function registerSessionHandlers(socket: Socket): void {
  socket.on("session:join", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.join(room);
    logger.debug({ socketId: socket.id, room }, "Joined session room");
  });

  socket.on("session:leave", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.leave(room);
    logger.debug({ socketId: socket.id, room }, "Left session room");
  });
}
