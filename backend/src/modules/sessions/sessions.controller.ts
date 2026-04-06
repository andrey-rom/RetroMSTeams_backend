import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { createLimiter } from "../../shared/middleware/rate-limit.js";
import {
  createSessionSchema,
  advancePhaseSchema,
} from "./sessions.schema.js";
import * as repo from "./sessions.repository.js";
import * as service from "./sessions.service.js";
import { getSessionSummary } from "./sessions.summary.js";
import { publishSummary } from "../teams/teams.service.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", createLimiter, validate(createSessionSchema), async (req, res) => {
  const { title, templateTypeId, msTeamsId, msChannelId, maxVotesPerUser } =
    req.body;

  const session = await repo.create({
    title,
    creatorId: req.userId,
    templateTypeId,
    msTeamsId: msTeamsId || "dev-team",
    msChannelId: msChannelId || "dev-channel",
    maxVotesPerUser,
  });

  res.status(201);
  await res.json(session);
});

sessionsRouter.get("/:id", async (req, res, next) => {
  try {
    const session = await repo.findById(req.params.id);
    if (!session) throw new NotFoundError("Session");
    await res.json(session);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get("/", async (req, res) => {
  const channelId = (req.query.channelId as string) || "dev-channel";
  const sessions = await repo.findByChannel(channelId);
  await res.json(sessions);
});

sessionsRouter.get("/:id/summary", async (req, res, next) => {
  try {
    const summary = await getSessionSummary(req.params.id);
    await res.json(summary);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post("/:id/publish", async (req, res, next) => {
  try {
    const result = await publishSummary(req.params.id, req.userId);
    await res.json(result);
  } catch (err) {
    next(err);
  }
});

sessionsRouter.put(
  "/:id/phase",
  validate(advancePhaseSchema),
  async (req, res, next) => {
    try {
      const updated = await service.advancePhase(req.params.id, req.body.phase, req.userId);
      await res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
