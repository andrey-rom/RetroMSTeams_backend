import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../config/db.js";
import { ConflictError } from "../../shared/errors/app-error.js";

/**
 * Cast a vote atomically.
 * The DB unique constraint on (cardId, voterHash) is the source of truth —
 * no serializable isolation needed since there is no multi-row limit to check.
 *
 * @throws ConflictError if user already voted on this card
 */
export async function castVoteAtomic(cardId: string, voterHash: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const vote = await tx.vote.create({
        data: { cardId, voterHash },
      });

      const card = await tx.card.update({
        where: { id: cardId },
        data: { votesCount: { increment: 1 } },
      });

      return { vote, card };
    });
  } catch (err) {
    // P2002 = unique constraint violation — user already voted on this card
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("You already voted on this card");
    }
    throw err;
  }
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
    where: { voterHash, card: { sessionId } },
    select: { cardId: true },
  });
  return votes.map((v) => v.cardId);
}
