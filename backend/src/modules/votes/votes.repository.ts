import { prisma } from "../../config/db.js";

export async function addVote(cardId: string, voterHash: string) {
  return prisma.$transaction(async (tx) => {
    const vote = await tx.vote.create({
      data: { cardId, voterHash },
    });

    const card = await tx.card.update({
      where: { id: cardId },
      data: { votesCount: { increment: 1 } },
    });

    return { vote, card };
  });
}

export async function removeVote(cardId: string, voterHash: string) {
  return prisma.$transaction(async (tx) => {
    await tx.vote.delete({
      where: { cardId_voterHash: { cardId, voterHash } },
    });

    const card = await tx.card.update({
      where: { id: cardId },
      data: { votesCount: { decrement: 1 } },
    });

    return { card };
  });
}

export async function countByVoterInSession(
  voterHash: string,
  sessionId: string,
): Promise<number> {
  return prisma.vote.count({
    where: {
      voterHash,
      card: { sessionId },
    },
  });
}

export async function findVote(cardId: string, voterHash: string) {
  return prisma.vote.findUnique({
    where: { cardId_voterHash: { cardId, voterHash } },
  });
}

export async function findVotedCardIds(
  voterHash: string,
  sessionId: string,
): Promise<string[]> {
  const votes = await prisma.vote.findMany({
    where: {
      voterHash,
      card: { sessionId },
    },
    select: { cardId: true },
  });
  return votes.map((v) => v.cardId);
}
