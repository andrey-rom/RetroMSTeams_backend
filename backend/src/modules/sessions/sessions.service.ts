import type { SessionPhase } from "../../generated/prisma/client.js";
import {
  NotFoundError,
  AppError,
  ForbiddenError,
} from "../../shared/errors/app-error.js";
import {
  emitPhaseChanged,
  emitTimerStarted,
  emitTimerExpired,
  emitCollectGrace,
} from "../../socket/emitters/board.emitter.js";
import * as timerManager from "../../shared/utils/timer-manager.js";
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

export async function scheduleCollectTimer(
  sessionId: string,
  seconds: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + seconds * 1000);

  await repo.setTimerExpiresAt(sessionId, expiresAt);
  emitTimerStarted(sessionId, expiresAt);

  timerManager.schedule(sessionId, expiresAt, async () => {
    const graceAt = new Date();
    await repo.setCollectGraceAt(sessionId, graceAt);
    emitCollectGrace(sessionId, graceAt);
  });
}

async function scheduleVoteTimer(
  sessionId: string,
  seconds: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + seconds * 1000);

  await repo.setTimerExpiresAt(sessionId, expiresAt);
  emitTimerStarted(sessionId, expiresAt);

  timerManager.schedule(sessionId, expiresAt, async () => {
    await repo.setTimerExpiresAt(sessionId, null);
    emitTimerExpired(sessionId);
  });
}

export async function startCollect(
  sessionId: string,
  userId: string,
) {
  const session = await repo.findById(sessionId);
  if (!session) throw new NotFoundError("Session");

  if (session.creatorId !== userId) {
    throw new ForbiddenError("Only the session moderator can start the session");
  }

  if (session.currentPhase !== "collect") {
    throw new AppError("Session is not in the collect phase");
  }

  if (!session.collectTimerSeconds) {
    throw new AppError("No collect timer configured for this session");
  }

  if (session.timerExpiresAt || session.collectGraceAt) {
    throw new AppError("Collect timer is already running or has expired");
  }

  const claimed = await repo.claimTimerStart(sessionId);
  if (!claimed) {
    throw new AppError("Collect timer is already running");
  }

  await scheduleCollectTimer(sessionId, session.collectTimerSeconds);

  return { started: true };
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

  timerManager.cancel(sessionId);

  const updated = await repo.updatePhase(sessionId, nextPhase);

  if (nextPhase === "summary") {
    await repo.updateStatus(sessionId, "completed");
  }

  emitPhaseChanged(sessionId, nextPhase);

  if (nextPhase === "vote" && session.voteTimerSeconds) {
    await scheduleVoteTimer(sessionId, session.voteTimerSeconds);
  }

  return updated;
}
