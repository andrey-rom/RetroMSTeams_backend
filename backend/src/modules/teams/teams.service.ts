import { env } from "../../config/env.js";
import { getSessionSummary } from "../sessions/sessions.summary.js";
import { buildSummaryCard } from "./adaptive-cards/summary.card.js";
import { prisma } from "../../config/db.js";
import {
  NotFoundError,
  AppError,
} from "../../shared/errors/app-error.js";

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
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

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
    throw new AppError(
      "Summary has already been published",
      409,
      "ALREADY_PUBLISHED",
    );
  }

  const summary = await getSessionSummary(sessionId);
  const adaptiveCard = buildSummaryCard(summary);

  let messageId: string;

  if (env.isDev) {
    messageId = `dev-msg-${Date.now()}`;
    console.log(
      `[teams] DEV MODE — would publish to channel ${session.msChannelId}`,
    );
    console.log(
      `[teams] Adaptive Card preview:\n${JSON.stringify(adaptiveCard, null, 2).slice(0, 500)}...`,
    );
  } else {
    // TODO: real MS Graph call
    // const graphClient = getGraphClient();
    // const res = await graphClient
    //   .api(`/teams/${session.msTeamsId}/channels/${session.msChannelId}/messages`)
    //   .post({
    //     body: {
    //       contentType: "html",
    //       content: `<attachment id="summary"></attachment>`,
    //     },
    //     attachments: [
    //       {
    //         id: "summary",
    //         contentType: "application/vnd.microsoft.card.adaptive",
    //         content: JSON.stringify(adaptiveCard),
    //       },
    //     ],
    //   });
    // messageId = res.id;
    messageId = `graph-msg-${Date.now()}`;
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      reportMessageId: messageId,
      currentStatus: "completed",
    },
  });

  return {
    sessionId,
    messageId,
    published: true,
    adaptiveCard,
  };
}
