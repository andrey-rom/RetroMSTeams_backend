import { Router } from "express";
import { generateOwnerHash } from "../../shared/utils/hash.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { voteLimiter } from "../../shared/middleware/rate-limit.js";
import * as votesRepo from "./votes.repository.js";
import * as votesService from "./votes.service.js";

export const votesRouter = Router();

votesRouter.get(
  "/sessions/:sessionId/my-votes",
  asyncHandler(async (req, res) => {
    const voterHash = generateOwnerHash(req.userId, req.params.sessionId);
    const cardIds = await votesRepo.findVotedCardIds(voterHash, req.params.sessionId);
    res.json({ cardIds });
  }),
);

votesRouter.post(
  "/cards/:cardId/vote",
  voteLimiter,
  asyncHandler(async (req, res) => {
    const card = await votesService.castVote(req.params.cardId, req.userId);
    res.json({ cardId: card.id, votesCount: card.votesCount });
  }),
);

votesRouter.delete(
  "/cards/:cardId/vote",
  voteLimiter,
  asyncHandler(async (req, res) => {
    const card = await votesService.removeVote(req.params.cardId, req.userId);
    res.json({ cardId: card.id, votesCount: card.votesCount });
  }),
);
