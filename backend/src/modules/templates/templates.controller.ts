import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import * as repo from "./templates.repository.js";

export const templatesRouter = Router();

templatesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const templates = await repo.findAll();
    res.json(templates);
  }),
);

templatesRouter.get(
  "/:code",
  asyncHandler(async (req, res) => {
    const template = await repo.findByCode(req.params.code.toUpperCase());
    if (!template) throw new NotFoundError("Template");
    res.json(template);
  }),
);
