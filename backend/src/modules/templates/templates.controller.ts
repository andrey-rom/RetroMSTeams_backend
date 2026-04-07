import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import * as repo from "./templates.repository.js";

export const templatesRouter = Router();

templatesRouter.get("/", asyncHandler(async (_req, res) => {
  const templates = await repo.findAll();
  res.json(templates);
}));

templatesRouter.get("/:code", asyncHandler(async (req, res) => {
  const template = await repo.findByCode(req.params.code.toUpperCase());

  if (!template) {
    res.status(404);
    res.json({ error: "Template not found" });
    return;
  }

  res.json(template);
}));
