/**
 * In-memory presence tracker for session rooms.
 *
 * Tracks unique users per session, supporting multiple sockets per user
 * (e.g. multiple browser tabs). A user is only considered "gone" when
 * all their sockets have left the session.
 *
 * Structure: sessionId → userId → Set<socketId>
 */

const sessions = new Map<string, Map<string, Set<string>>>();

const socketToSessions = new Map<string, Set<string>>();

export function addSocket(
  sessionId: string,
  userId: string,
  socketId: string,
): void {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Map());
  }
  const users = sessions.get(sessionId)!;
  if (!users.has(userId)) {
    users.set(userId, new Set());
  }
  users.get(userId)!.add(socketId);

  if (!socketToSessions.has(socketId)) {
    socketToSessions.set(socketId, new Set());
  }
  socketToSessions.get(socketId)!.add(sessionId);
}

export function removeSocket(
  sessionId: string,
  userId: string,
  socketId: string,
): void {
  const users = sessions.get(sessionId);
  if (!users) return;

  const sockets = users.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) users.delete(userId);
  if (users.size === 0) sessions.delete(sessionId);

  const tracked = socketToSessions.get(socketId);
  if (tracked) {
    tracked.delete(sessionId);
    if (tracked.size === 0) socketToSessions.delete(socketId);
  }
}

/**
 * Remove a socket from ALL sessions it belongs to.
 * Returns the list of affected sessionIds so callers can broadcast updates.
 */
export function removeSocketFromAll(
  socketId: string,
  userId: string,
): string[] {
  const tracked = socketToSessions.get(socketId);
  if (!tracked) return [];

  const affected = [...tracked];
  for (const sessionId of affected) {
    removeSocket(sessionId, userId, socketId);
  }
  return affected;
}

export function getActiveUserCount(sessionId: string): number {
  return sessions.get(sessionId)?.size ?? 0;
}
