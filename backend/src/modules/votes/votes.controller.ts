import { Router } from "express";
import { generateOwnerHash } from "../../shared/utils/hash.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { voteLimiter } from "../../shared/middleware/rate-limit.js";
import * as votesRepo from "./votes.repository.js";
import * as votesService from "./votes.service.js";

/** Mounted at /sessions — handles /sessions/:sessionId/my-votes */
export const sessionVotesRouter = Router();

sessionVotesRouter.get(
  "/:sessionId/my-votes",
  asyncHandler(async (req, res) => {
    const voterHash = generateOwnerHash(req.userId, req.params.sessionId);
    const cardIds = await votesRepo.findVotedCardIds(voterHash, req.params.sessionId);
    res.json({ cardIds });
  }),
);

/** Mounted at /cards — handles /cards/:cardId/vote */
export const cardVotesRouter = Router();

cardVotesRouter.post(
  "/:cardId/vote",
  voteLimiter,
  asyncHandler(async (req, res) => {
    const card = await votesService.castVote(req.params.cardId, req.userId);
    res.json({ cardId: card.id, votesCount: card.votesCount });
  }),
);

cardVotesRouter.delete(
  "/:cardId/vote",
  voteLimiter,
  asyncHandler(async (req, res) => {
    const card = await votesService.removeVote(req.params.cardId, req.userId);
    res.json({ cardId: card.id, votesCount: card.votesCount });
  }),
);
