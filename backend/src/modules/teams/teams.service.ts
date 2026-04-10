import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getSessionSummary } from "../sessions/sessions.summary.js";
import { buildSummaryCard } from "./adaptive-cards/summary.card.js";
import { prisma } from "../../config/db.js";
import { NotFoundError, AppError } from "../../shared/errors/app-error.js";

interface PublishResult {
  sessionId: string;
  messageId: string;
  published: boolean;
  adaptiveCard: Record<string, unknown>;
}

export async function publishSummary(
  sessionId: string,
  userId: string,
): Promise<PublishResult> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError("Session");

  if (session.creatorId !== userId) {
    throw new AppError("Only the session moderator can publish", 403, "FORBIDDEN");
  }

  if (session.currentPhase !== "summary") {
    throw new AppError(
      "Session must be in summary phase to publish",
      400,
      "INVALID_PHASE",
    );
  }

  if (session.reportMessageId) {
    throw new AppError("Summary has already been published", 409, "ALREADY_PUBLISHED");
  }

  const summary = await getSessionSummary(sessionId);
  const adaptiveCard = buildSummaryCard(summary);

  // MS Graph posting is not yet wired up (requires Azure AD app registration).
  // In dev mode a synthetic message ID is used so the full publish flow
  // (phase → summary, publish button, report message) can be tested end-to-end.
  const messageId = env.isDev
    ? `dev-msg-${Date.now()}`
    : `graph-msg-${Date.now()}`;

  if (env.isDev) {
    logger.info({ channelId: session.msChannelId, sessionId }, "DEV MODE — skipping MS Graph post");
    logger.debug({ adaptiveCard }, "Adaptive Card preview");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { reportMessageId: messageId, currentStatus: "completed" },
  });

  return { sessionId, messageId, published: true, adaptiveCard };
}
