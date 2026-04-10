import { logger } from "../../config/logger.js";
import { prisma } from "../../config/db.js";

type TimerCallback = () => void | Promise<void>;

const timers = new Map<string, NodeJS.Timeout>();

export function schedule(
  sessionId: string,
  expiresAt: Date,
  callback: TimerCallback,
): void {
  cancel(sessionId);

  const ms = expiresAt.getTime() - Date.now();

  if (ms <= 0) {
    logger.info({ sessionId }, "Timer already expired, firing immediately");
    void safeCall(sessionId, callback);
    return;
  }

  const timeout = setTimeout(() => {
    timers.delete(sessionId);
    void safeCall(sessionId, callback);
  }, ms);

  timers.set(sessionId, timeout);
  logger.info({ sessionId, expiresAt: expiresAt.toISOString(), ms }, "Timer scheduled");
}

export function cancel(sessionId: string): void {
  const existing = timers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(sessionId);
    logger.debug({ sessionId }, "Timer cancelled");
  }
}

export async function restoreAll(
  onExpired: (sessionId: string, phase: string) => void | Promise<void>,
): Promise<void> {
  const active = await prisma.session.findMany({
    where: {
      timerExpiresAt: { not: null },
      currentPhase: { in: ["collect", "vote"] },
    },
    select: { id: true, currentPhase: true, timerExpiresAt: true },
  });

  let restored = 0;
  for (const s of active) {
    if (!s.timerExpiresAt) continue;

    const phase = s.currentPhase;
    schedule(s.id, s.timerExpiresAt, () => onExpired(s.id, phase));
    restored++;
  }

  if (restored > 0) {
    logger.info({ count: restored }, "Restored active timers from DB");
  }
}

async function safeCall(sessionId: string, cb: TimerCallback): Promise<void> {
  try {
    await cb();
  } catch (err) {
    logger.warn({ sessionId, err }, "Timer callback failed");
  }
}
