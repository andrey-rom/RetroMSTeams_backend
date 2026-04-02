import { Router } from "express";
import * as repo from "./templates.repository.js";

export const templatesRouter = Router();

templatesRouter.get("/", async (_req, res) => {
  const templates = await repo.findAll();
  await res.json(templates);
});

templatesRouter.get("/:code", async (req, res) => {
  const template = await repo.findByCode(req.params.code.toUpperCase());

  if (!template) {
    res.status(404);
    await res.json({ error: "Template not found" });
    return;
  }

  await res.json(template);
});
