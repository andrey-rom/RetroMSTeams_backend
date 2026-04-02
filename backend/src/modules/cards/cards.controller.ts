import { Router } from "express";
import * as cardsRepo from "./cards.repository.js";
import * as cardsService from "./cards.service.js";

export const cardsRouter = Router({ mergeParams: true });

cardsRouter.get("/:sessionId/cards", async (req, res) => {
  const cards = await cardsRepo.findBySession(req.params.sessionId);
  await res.json(cards);
});

cardsRouter.post("/:sessionId/cards", async (req, res) => {
  const { columnKey, content } = req.body;

  if (!columnKey || !content) {
    res.status(400);
    await res.json({ error: "columnKey and content are required" });
    return;
  }

  try {
    const card = await cardsService.createCard(
      req.params.sessionId,
      columnKey,
      content,
      req.userId,
    );
    res.status(201);
    await res.json(card);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400);
    await res.json({ error: message });
  }
});

cardsRouter.put("/cards/:id", async (req, res) => {
  const { content } = req.body;

  if (!content) {
    res.status(400);
    await res.json({ error: "content is required" });
    return;
  }

  try {
    const card = await cardsService.updateCard(
      req.params.id,
      content,
      req.userId,
    );
    await res.json(card);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400);
    await res.json({ error: message });
  }
});

cardsRouter.delete("/cards/:id", async (req, res) => {
  try {
    await cardsService.deleteCard(req.params.id, req.userId);
    await res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400);
    await res.json({ error: message });
  }
});
