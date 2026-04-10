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

async function postToWebhook(
  webhookUrl: string,
  adaptiveCard: Record<string, unknown>,
): Promise<string> {
  const payload = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: adaptiveCard,
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AppError(
      `Teams webhook rejected the message (HTTP ${res.status}): ${text}`,
      502,
      "WEBHOOK_ERROR",
    );
  }

  return `webhook-msg-${Date.now()}`;
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

  let messageId: string;

  if (env.teamsWebhookUrl) {
    messageId = await postToWebhook(env.teamsWebhookUrl, adaptiveCard);
    logger.info({ sessionId, channelId: session.msChannelId }, "Summary published to Teams channel");
  } else {
    // No webhook configured — log the card for local dev
    messageId = `dev-msg-${Date.now()}`;
    logger.info({ sessionId }, "TEAMS_WEBHOOK_URL not set — skipping Teams post");
    logger.debug({ adaptiveCard }, "Adaptive Card preview");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { reportMessageId: messageId, currentStatus: "completed" },
  });

  return { sessionId, messageId, published: true, adaptiveCard };
}
