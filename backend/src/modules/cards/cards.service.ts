import { generateOwnerHash } from "../../shared/utils/hash.js";
import {
  NotFoundError,
  AppError,
  ForbiddenError,
} from "../../shared/errors/app-error.js";
import {
  emitCardCreated,
  emitCardUpdated,
  emitCardDeleted,
} from "../../socket/emitters/board.emitter.js";
import * as sessionsRepo from "../sessions/sessions.repository.js";
import * as cardsRepo from "./cards.repository.js";

export async function createCard(
  sessionId: string,
  columnKey: string,
  content: string,
  userId: string,
) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new NotFoundError("Session");
  if (session.currentPhase !== "collect") {
    throw new AppError("Cards can only be added during the collect phase");
  }

  const ownerHash = generateOwnerHash(userId, sessionId);

  if (session.collectGraceAt) {
    const graceCards = await cardsRepo.countByOwnerInColumnSince(
      sessionId,
      columnKey,
      ownerHash,
      session.collectGraceAt,
    );
    if (graceCards >= 1) {
      throw new AppError(
        "Time is up — you've already added your last card to this column",
        403,
        "GRACE_LIMIT",
      );
    }
  }

  const card = await cardsRepo.create({
    sessionId,
    columnKey,
    content,
    ownerHash,
  });

  emitCardCreated(sessionId, card);
  return card;
}

export async function updateCard(
  cardId: string,
  content: string,
  userId: string,
) {
  const card = await cardsRepo.findById(cardId);
  if (!card) throw new NotFoundError("Card");

  const session = await sessionsRepo.findById(card.sessionId);
  if (session?.currentPhase !== "collect") {
    throw new AppError("Cards can only be edited during the collect phase");
  }

  const ownerHash = generateOwnerHash(userId, card.sessionId);
  if (card.ownerHash !== ownerHash) {
    throw new ForbiddenError("You can only edit your own cards");
  }

  const updated = await cardsRepo.update(cardId, content);
  emitCardUpdated(card.sessionId, updated);
  return updated;
}

export async function deleteCard(cardId: string, userId: string) {
  const card = await cardsRepo.findById(cardId);
  if (!card) throw new NotFoundError("Card");

  const session = await sessionsRepo.findById(card.sessionId);
  if (session?.currentPhase !== "collect") {
    throw new AppError("Cards can only be deleted during the collect phase");
  }

  const ownerHash = generateOwnerHash(userId, card.sessionId);
  if (card.ownerHash !== ownerHash) {
    throw new ForbiddenError("You can only delete your own cards");
  }

  await cardsRepo.remove(cardId);
  emitCardDeleted(card.sessionId, cardId);
}
