import type { SessionPhase } from "../../generated/prisma/client.js";
import { getIO } from "../socket.js";

interface CardPayload {
  id: string;
  sessionId: string;
  columnKey: string;
  content: string;
  ownerHash: string;
  votesCount: number;
  createdAt: Date | string;
}

export function emitCardCreated(sessionId: string, card: CardPayload): void {
  getIO().to(`session:${sessionId}`).emit("card:created", card);
}

export function emitCardUpdated(sessionId: string, card: CardPayload): void {
  getIO().to(`session:${sessionId}`).emit("card:updated", card);
}

export function emitCardDeleted(sessionId: string, cardId: string): void {
  getIO().to(`session:${sessionId}`).emit("card:deleted", { cardId });
}

export function emitVoteUpdated(
  sessionId: string,
  cardId: string,
  votesCount: number,
): void {
  getIO()
    .to(`session:${sessionId}`)
    .emit("vote:updated", { cardId, votesCount });
}

export function emitPhaseChanged(
  sessionId: string,
  phase: SessionPhase,
  timerExpiresAt?: Date,
): void {
  getIO().to(`session:${sessionId}`).emit("phase:changed", {
    phase,
    timerExpiresAt: timerExpiresAt?.toISOString(),
  });
}
