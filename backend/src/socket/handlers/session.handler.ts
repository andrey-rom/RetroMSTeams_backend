import type { Socket } from "socket.io";
import { logger } from "../../config/logger.js";
import { emitActiveUsers } from "../emitters/board.emitter.js";
import * as presence from "../session-presence.js";

export function registerSessionHandlers(socket: Socket): void {
  const userId = socket.handshake.auth.userId as string;

  socket.on("session:join", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.join(room);
    presence.addSocket(sessionId, userId, socket.id);
    emitActiveUsers(sessionId, presence.getActiveUserCount(sessionId));
    logger.debug({ socketId: socket.id, room, userId }, "Joined session room");
  });

  socket.on("session:leave", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.leave(room);
    presence.removeSocket(sessionId, userId, socket.id);
    emitActiveUsers(sessionId, presence.getActiveUserCount(sessionId));
    logger.debug({ socketId: socket.id, room, userId }, "Left session room");
  });
}
