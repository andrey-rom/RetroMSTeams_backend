import { Router } from "express";
import { templatesRouter } from "./modules/templates/templates.controller.js";
import { sessionsRouter } from "./modules/sessions/sessions.controller.js";
import { sessionCardsRouter, cardsRouter } from "./modules/cards/cards.controller.js";
import { sessionVotesRouter, cardVotesRouter } from "./modules/votes/votes.controller.js";

export function createApiRouter(): Router {
  const router = Router();

  // /api/templates
  router.use("/templates", templatesRouter);

  // /api/sessions, /api/sessions/:id/cards, /api/sessions/:id/my-votes
  router.use("/sessions", sessionsRouter);
  router.use("/sessions", sessionCardsRouter);
  router.use("/sessions", sessionVotesRouter);

  // /api/cards/:id, /api/cards/:id/vote
  router.use("/cards", cardsRouter);
  router.use("/cards", cardVotesRouter);

  return router;
}
