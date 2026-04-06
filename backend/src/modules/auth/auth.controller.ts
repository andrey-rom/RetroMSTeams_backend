import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { exchangeTeamsTokenSchema } from "./auth.schema.js";
import { exchangeTeamsToken } from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/teams",
  validate(exchangeTeamsTokenSchema),
  async (req, res, next) => {
    try {
      const result = await exchangeTeamsToken(req.body.ssoToken);
      await res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
