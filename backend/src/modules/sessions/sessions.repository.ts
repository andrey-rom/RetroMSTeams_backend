import { prisma } from "../../config/db.js";
import type { SessionPhase, SessionStatus } from "../../generated/prisma/client.js";

interface CreateSessionInput {
  title: string;
  creatorId: string;
  msTeamsId: string;
  msChannelId: string;
  templateTypeId: string;
  maxVotesPerUser?: number;
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
      currentStatus: "active",
    },
    include: {
      templateType: {
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

export async function findById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      templateType: {
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
    },
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
    data: { currentPhase: phase },
    include: {
      templateType: {
        include: { values: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

export async function updateStatus(id: string, status: SessionStatus) {
  return prisma.session.update({
    where: { id },
    data: { currentStatus: status },
  });
}
