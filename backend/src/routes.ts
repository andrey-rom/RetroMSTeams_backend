import { Router } from "express";
import { templatesRouter } from "./modules/templates/templates.controller.js";
import { sessionsRouter } from "./modules/sessions/sessions.controller.js";
import { cardsRouter } from "./modules/cards/cards.controller.js";
import { votesRouter } from "./modules/votes/votes.controller.js";

export function createApiRouter(): Router {
  const router = Router();

  router.use("/templates", templatesRouter);
  router.use("/sessions", sessionsRouter);
  router.use("/cards", cardsRouter);
  router.use("/", votesRouter);

  return router;
}
