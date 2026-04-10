import { prisma } from "../../config/db.js";
import type { SessionPhase, SessionStatus } from "../../generated/prisma/client.js";

const TEMPLATE_INCLUDE = {
  templateType: {
    include: { values: { orderBy: { sortOrder: "asc" as const } } },
  },
} as const;

interface CreateSessionInput {
  title: string;
  creatorId: string;
  msTeamsId: string;
  msChannelId: string;
  templateTypeId: string;
  maxVotesPerUser?: number;
  collectTimerSeconds?: number;
  voteTimerSeconds?: number;
}

export async function create(data: CreateSessionInput) {
  return prisma.session.create({
    data: {
      title: data.title,
      creatorId: data.creatorId,
      msTeamsId: data.msTeamsId,
      msChannelId: data.msChannelId,
      templateTypeId: data.templateTypeId,
      maxVotesPerUser: data.maxVotesPerUser ?? 5,
      collectTimerSeconds: data.collectTimerSeconds ?? null,
      voteTimerSeconds: data.voteTimerSeconds ?? null,
      currentStatus: "active",
    },
    include: TEMPLATE_INCLUDE,
  });
}

export async function findById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: TEMPLATE_INCLUDE,
  });
}

export async function findByChannel(channelId: string) {
  return prisma.session.findMany({
    where: { msChannelId: channelId },
    include: { templateType: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updatePhase(id: string, phase: SessionPhase) {
  return prisma.session.update({
    where: { id },
    data: { currentPhase: phase, timerExpiresAt: null, collectGraceAt: null },
    include: TEMPLATE_INCLUDE,
  });
}

export async function setTimerExpiresAt(id: string, timerExpiresAt: Date | null) {
  return prisma.session.update({
    where: { id },
    data: { timerExpiresAt },
    include: TEMPLATE_INCLUDE,
  });
}

export async function setCollectGraceAt(id: string, collectGraceAt: Date) {
  return prisma.session.update({
    where: { id },
    data: { collectGraceAt, timerExpiresAt: null },
    include: TEMPLATE_INCLUDE,
  });
}

/**
 * Atomically claim the timer start slot for a session.
 * Uses updateMany with a sentinel value (epoch) so only one concurrent
 * caller wins — subsequent calls see timerExpiresAt != null and return false.
 */
export async function claimTimerStart(id: string): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: { id, timerExpiresAt: null, collectGraceAt: null },
    data: { timerExpiresAt: new Date(0) },
  });
  return result.count > 0;
}

export async function updateStatus(id: string, status: SessionStatus) {
  return prisma.session.update({
    where: { id },
    data: { currentStatus: status },
  });
}
