import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { apiLimiter, createLimiter } from "../../shared/middleware/rate-limit.js";
import {
  createSessionSchema,
  advancePhaseSchema,
} from "./sessions.schema.js";
import * as repo from "./sessions.repository.js";
import * as service from "./sessions.service.js";
import { getSessionSummary } from "./sessions.summary.js";
import { publishSummary } from "../teams/teams.service.js";
import { generateOwnerHash } from "../../shared/utils/hash.js";
import * as cardsRepo from "../cards/cards.repository.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", createLimiter, validate(createSessionSchema), async (req, res, next) => {
  try {
    const {
      title, templateTypeId, msTeamsId, msChannelId,
      maxVotesPerUser, collectTimerSeconds, voteTimerSeconds,
    } = req.body;

    const session = await repo.create({
      title,
      creatorId: req.userId,
      templateTypeId,
      msTeamsId: msTeamsId || "dev-team",
      msChannelId: msChannelId || "dev-channel",
      maxVotesPerUser,
      collectTimerSeconds,
      voteTimerSeconds,
    });

    res.status(201);
    await res.json(session);
  } catch (err) {
    next(err);
  }
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

sessionsRouter.get("/", asyncHandler(async (req, res) => {
  const channelId = (req.query.channelId as string) || "dev-channel";
  const sessions = await repo.findByChannel(channelId);
  res.json(sessions);
}));

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

sessionsRouter.get("/:id/grace-status", apiLimiter, async (req, res, next) => {
  try {
    const session = await repo.findById(req.params.id);
    if (!session) throw new NotFoundError("Session");

    const graceActive = session.currentPhase === "collect" && !!session.collectGraceAt;

    if (!graceActive || !session.collectGraceAt) {
      await res.json({ graceActive: false, usedColumns: [] });
      return;
    }

    const ownerHash = generateOwnerHash(req.userId, req.params.id);
    const usedColumns = await cardsRepo.graceUsedColumns(
      req.params.id,
      ownerHash,
      session.collectGraceAt,
    );
    await res.json({ graceActive: true, usedColumns });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post("/:id/start", apiLimiter, async (req, res, next) => {
  try {
    const result = await service.startCollect(req.params.id, req.userId);
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
