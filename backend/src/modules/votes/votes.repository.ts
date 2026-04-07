import { prisma } from "../../config/db.js";
import { ConflictError, AppError } from "../../shared/errors/app-error.js";

/**
 * Atomically cast a vote with validation inside a serializable transaction.
 * Prevents race conditions where concurrent requests both pass the vote limit check.
 *
 * @throws ConflictError if user already voted on this card
 * @throws AppError if user has exceeded maxVotesPerUser
 */
export async function castVoteAtomic(
  cardId: string,
  voterHash: string,
  sessionId: string,
  maxVotesPerUser: number,
) {
  return prisma.$transaction(
    async (tx) => {
      // Check if vote already exists
      const existing = await tx.vote.findUnique({
        where: { cardId_voterHash: { cardId, voterHash } },
      });
      if (existing) {
        throw new ConflictError("You already voted on this card");
      }

      // Count total votes for this user in this session
      const totalVotes = await tx.vote.count({
        where: {
          voterHash,
          card: { sessionId },
        },
      });
      if (totalVotes >= maxVotesPerUser) {
        throw new AppError(
          `You have used all ${maxVotesPerUser} votes in this session`,
        );
      }

      // Create vote and increment card vote count atomically
      const vote = await tx.vote.create({
        data: { cardId, voterHash },
      });

      const card = await tx.card.update({
        where: { id: cardId },
        data: { votesCount: { increment: 1 } },
      });

      return { vote, card };
    },
    {
      isolationLevel: "Serializable",
      timeout: 5000, // 5 second timeout to prevent deadlocks
    },
  );
}

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
