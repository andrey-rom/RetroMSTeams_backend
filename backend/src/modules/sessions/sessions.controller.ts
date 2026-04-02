import { Router } from "express";
import type { SessionPhase } from "../../generated/prisma/client.js";
import * as repo from "./sessions.repository.js";
import * as service from "./sessions.service.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", async (req, res) => {
  const { title, templateTypeId, msTeamsId, msChannelId, maxVotesPerUser } =
    req.body;

  if (!title || !templateTypeId) {
    res.status(400);
    await res.json({ error: "title and templateTypeId are required" });
    return;
  }

  const session = await repo.create({
    title,
    templateTypeId,
    msTeamsId: msTeamsId || "dev-team",
    msChannelId: msChannelId || "dev-channel",
    maxVotesPerUser,
  });

  res.status(201);
  await res.json(session);
});

sessionsRouter.get("/:id", async (req, res) => {
  const session = await repo.findById(req.params.id);

  if (!session) {
    res.status(404);
    await res.json({ error: "Session not found" });
    return;
  }

  await res.json(session);
});

sessionsRouter.get("/", async (req, res) => {
  const channelId = (req.query.channelId as string) || "dev-channel";
  const sessions = await repo.findByChannel(channelId);
  await res.json(sessions);
});

sessionsRouter.put("/:id/phase", async (req, res) => {
  const { phase } = req.body as { phase: SessionPhase };

  if (!phase) {
    res.status(400);
    await res.json({ error: "phase is required" });
    return;
  }

  try {
    const updated = await service.advancePhase(req.params.id, phase);
    await res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400);
    await res.json({ error: message });
  }
});
