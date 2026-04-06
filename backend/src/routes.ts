import { Router } from "express";
import { authRouter } from "./modules/auth/auth.controller.js";
import { templatesRouter } from "./modules/templates/templates.controller.js";
import { sessionsRouter } from "./modules/sessions/sessions.controller.js";
import { cardsRouter } from "./modules/cards/cards.controller.js";
import { votesRouter } from "./modules/votes/votes.controller.js";

export function createPublicApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRouter);

  return router;
}

export function createProtectedApiRouter(): Router {
  const router = Router();

  router.use("/templates", templatesRouter);
  router.use("/sessions", sessionsRouter);
  router.use("/sessions", cardsRouter);
  router.use("/", votesRouter);

  return router;
}
