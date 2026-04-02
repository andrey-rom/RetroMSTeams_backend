import { prisma } from "../../config/db.js";

interface CreateCardInput {
  sessionId: string;
  columnKey: string;
  content: string;
  ownerHash: string;
}

export async function create(data: CreateCardInput) {
  return prisma.card.create({ data });
}

export async function findBySession(sessionId: string) {
  return prisma.card.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function findById(id: string) {
  return prisma.card.findUnique({ where: { id } });
}

export async function update(id: string, content: string) {
  return prisma.card.update({
    where: { id },
    data: { content },
  });
}

export async function remove(id: string) {
  return prisma.card.delete({ where: { id } });
}
