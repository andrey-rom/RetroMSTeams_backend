import { generateOwnerHash } from "../../shared/utils/hash.js";
import {
  NotFoundError,
  AppError,
} from "../../shared/errors/app-error.js";
import { emitVoteUpdated } from "../../socket/emitters/board.emitter.js";
import * as cardsRepo from "../cards/cards.repository.js";
import * as sessionsRepo from "../sessions/sessions.repository.js";
import * as votesRepo from "./votes.repository.js";

export async function castVote(cardId: string, userId: string) {
  const card = await cardsRepo.findById(cardId);
  if (!card) throw new NotFoundError("Card");

  const session = await sessionsRepo.findById(card.sessionId);
  if (!session) throw new NotFoundError("Session");
  if (session.currentPhase !== "vote") {
    throw new AppError("Voting is only allowed during the vote phase");
  }

  const voterHash = generateOwnerHash(userId, card.sessionId);

  const { card: updated } = await votesRepo.castVoteAtomic(cardId, voterHash);

  emitVoteUpdated(card.sessionId, cardId, updated.votesCount);
  return updated;
}

export async function removeVote(cardId: string, userId: string) {
  const card = await cardsRepo.findById(cardId);
  if (!card) throw new NotFoundError("Card");

  const session = await sessionsRepo.findById(card.sessionId);
  if (!session) throw new NotFoundError("Session");
  if (session.currentPhase !== "vote") {
    throw new AppError("Voting is only allowed during the vote phase");
  }

  const voterHash = generateOwnerHash(userId, card.sessionId);

  const existing = await votesRepo.findVote(cardId, voterHash);
  if (!existing) throw new NotFoundError("Vote");

  const { card: updated } = await votesRepo.removeVote(cardId, voterHash);

  // Guard against vote count going negative (should not happen, but catch data integrity issues)
  if (updated.votesCount < 0) {
    throw new AppError("Vote count integrity error - count went negative");
  }

  emitVoteUpdated(card.sessionId, cardId, updated.votesCount);
  return updated;
}
