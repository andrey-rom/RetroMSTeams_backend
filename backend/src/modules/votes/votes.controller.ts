import { Router } from "express";
import { generateOwnerHash } from "../../shared/utils/hash.js";
import { voteLimiter } from "../../shared/middleware/rate-limit.js";
import * as votesRepo from "./votes.repository.js";
import * as votesService from "./votes.service.js";

export const votesRouter = Router();

votesRouter.get("/sessions/:sessionId/my-votes", async (req, res) => {
  const voterHash = generateOwnerHash(req.userId, req.params.sessionId);
  const cardIds = await votesRepo.findVotedCardIds(
    voterHash,
    req.params.sessionId,
  );
  await res.json({ cardIds });
});

votesRouter.post("/cards/:cardId/vote", voteLimiter, async (req, res, next) => {
  try {
    const card = await votesService.castVote(req.params.cardId, req.userId);
    await res.json({ cardId: card.id, votesCount: card.votesCount });
  } catch (err) {
    next(err);
  }
});

votesRouter.delete("/cards/:cardId/vote", voteLimiter, async (req, res, next) => {
  try {
    const card = await votesService.removeVote(req.params.cardId, req.userId);
    await res.json({ cardId: card.id, votesCount: card.votesCount });
  } catch (err) {
    next(err);
  }
});
