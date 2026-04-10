import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { createLimiter } from "../../shared/middleware/rate-limit.js";
import { createCardSchema, updateCardSchema } from "./cards.schema.js";
import * as cardsRepo from "./cards.repository.js";
import * as cardsService from "./cards.service.js";

/** Mounted at /sessions — handles /sessions/:sessionId/cards */
export const sessionCardsRouter = Router();

sessionCardsRouter.get(
  "/:sessionId/cards",
  asyncHandler(async (req, res) => {
    const cards = await cardsRepo.findBySession(req.params.sessionId);
    res.json(cards);
  }),
);

sessionCardsRouter.post(
  "/:sessionId/cards",
  createLimiter,
  validate(createCardSchema),
  asyncHandler(async (req, res) => {
    const card = await cardsService.createCard(
      req.params.sessionId,
      req.body.columnKey,
      req.body.content,
      req.userId,
    );
    res.status(201).json(card);
  }),
);

/** Mounted at /cards — handles /cards/:id */
export const cardsRouter = Router();

cardsRouter.put(
  "/:id",
  validate(updateCardSchema),
  asyncHandler(async (req, res) => {
    const card = await cardsService.updateCard(
      req.params.id,
      req.body.content,
      req.userId,
    );
    res.json(card);
  }),
);

cardsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await cardsService.deleteCard(req.params.id, req.userId);
    res.json({ success: true });
  }),
);
