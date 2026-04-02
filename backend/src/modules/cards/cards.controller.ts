import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { createCardSchema, updateCardSchema } from "./cards.schema.js";
import * as cardsRepo from "./cards.repository.js";
import * as cardsService from "./cards.service.js";

export const cardsRouter = Router({ mergeParams: true });

cardsRouter.get("/:sessionId/cards", async (req, res) => {
  const cards = await cardsRepo.findBySession(req.params.sessionId);
  await res.json(cards);
});

cardsRouter.post(
  "/:sessionId/cards",
  validate(createCardSchema),
  async (req, res, next) => {
    try {
      const card = await cardsService.createCard(
        req.params.sessionId,
        req.body.columnKey,
        req.body.content,
        req.userId,
      );
      res.status(201);
      await res.json(card);
    } catch (err) {
      next(err);
    }
  },
);

cardsRouter.put(
  "/cards/:id",
  validate(updateCardSchema),
  async (req, res, next) => {
    try {
      const card = await cardsService.updateCard(
        req.params.id,
        req.body.content,
        req.userId,
      );
      await res.json(card);
    } catch (err) {
      next(err);
    }
  },
);

cardsRouter.delete("/cards/:id", async (req, res, next) => {
  try {
    await cardsService.deleteCard(req.params.id, req.userId);
    await res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
