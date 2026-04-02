import type { SessionPhase } from "../../generated/prisma/client.js";
import {
  NotFoundError,
  AppError,
  ForbiddenError,
} from "../../shared/errors/app-error.js";
import { emitPhaseChanged } from "../../socket/emitters/board.emitter.js";
import * as repo from "./sessions.repository.js";

const ALLOWED_TRANSITIONS: Record<SessionPhase, SessionPhase[]> = {
  collect: ["vote", "summary"],
  vote: ["summary"],
  summary: [],
};

export function canTransition(
  from: SessionPhase,
  to: SessionPhase,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export async function advancePhase(
  sessionId: string,
  nextPhase: SessionPhase,
  userId: string,
) {
  const session = await repo.findById(sessionId);
  if (!session) throw new NotFoundError("Session");

  if (session.creatorId !== userId) {
    throw new ForbiddenError("Only the session moderator can change phases");
  }

  if (!canTransition(session.currentPhase, nextPhase)) {
    throw new AppError(
      `Cannot transition from "${session.currentPhase}" to "${nextPhase}"`,
    );
  }

  const updated = await repo.updatePhase(sessionId, nextPhase);

  if (nextPhase === "summary") {
    await repo.updateStatus(sessionId, "completed");
  }

  emitPhaseChanged(sessionId, nextPhase);
  return updated;
}
