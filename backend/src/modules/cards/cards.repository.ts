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

export async function graceUsedColumns(
  sessionId: string,
  ownerHash: string,
  since: Date,
): Promise<string[]> {
  const cards = await prisma.card.findMany({
    where: {
      sessionId,
      ownerHash,
      createdAt: { gte: since },
    },
    select: { columnKey: true },
    distinct: ["columnKey"],
  });
  return cards.map((c) => c.columnKey);
}

export async function countByOwnerInColumnSince(
  sessionId: string,
  columnKey: string,
  ownerHash: string,
  since: Date,
): Promise<number> {
  return prisma.card.count({
    where: {
      sessionId,
      columnKey,
      ownerHash,
      createdAt: { gte: since },
    },
  });
}
