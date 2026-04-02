import type { Socket } from "socket.io";

export function registerSessionHandlers(socket: Socket): void {
  socket.on("session:join", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined ${room}`);
  });

  socket.on("session:leave", (sessionId: string) => {
    const room = `session:${sessionId}`;
    socket.leave(room);
    console.log(`[socket] ${socket.id} left ${room}`);
  });
}
