import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { apiLimiter, createLimiter } from "../../shared/middleware/rate-limit.js";
import { createSessionSchema, advancePhaseSchema } from "./sessions.schema.js";
import * as repo from "./sessions.repository.js";
import * as service from "./sessions.service.js";
import { getSessionSummary } from "./sessions.summary.js";
import { publishSummary } from "../teams/teams.service.js";
import { generateOwnerHash } from "../../shared/utils/hash.js";
import * as cardsRepo from "../cards/cards.repository.js";

export const sessionsRouter = Router();

sessionsRouter.post(
  "/",
  createLimiter,
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
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

    res.status(201).json(session);
  }),
);

sessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const channelId = (req.query.channelId as string) || "dev-channel";
    const sessions = await repo.findByChannel(channelId);
    res.json(sessions);
  }),
);

sessionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = await repo.findById(req.params.id);
    if (!session) throw new NotFoundError("Session");
    res.json(session);
  }),
);

sessionsRouter.get(
  "/:id/summary",
  asyncHandler(async (req, res) => {
    const summary = await getSessionSummary(req.params.id);
    res.json(summary);
  }),
);

sessionsRouter.post(
  "/:id/publish",
  asyncHandler(async (req, res) => {
    const result = await publishSummary(req.params.id, req.userId);
    res.json(result);
  }),
);

sessionsRouter.get(
  "/:id/grace-status",
  apiLimiter,
  asyncHandler(async (req, res) => {
    const session = await repo.findById(req.params.id);
    if (!session) throw new NotFoundError("Session");

    const graceActive = session.currentPhase === "collect" && !!session.collectGraceAt;

    if (!graceActive || !session.collectGraceAt) {
      res.json({ graceActive: false, usedColumns: [] });
      return;
    }

    const ownerHash = generateOwnerHash(req.userId, req.params.id);
    const usedColumns = await cardsRepo.graceUsedColumns(
      req.params.id,
      ownerHash,
      session.collectGraceAt,
    );
    res.json({ graceActive: true, usedColumns });
  }),
);

sessionsRouter.post(
  "/:id/start",
  apiLimiter,
  asyncHandler(async (req, res) => {
    const result = await service.startCollect(req.params.id, req.userId);
    res.json(result);
  }),
);

sessionsRouter.put(
  "/:id/phase",
  validate(advancePhaseSchema),
  asyncHandler(async (req, res) => {
    const updated = await service.advancePhase(req.params.id, req.body.phase, req.userId);
    res.json(updated);
  }),
);
