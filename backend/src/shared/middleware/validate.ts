import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map(
        (e) => `${e.path.join(".") || "body"}: ${e.message}`,
      );
      res.status(400);
      await res.json({ error: "Validation failed", details: messages });
      return;
    }

    req.body = result.data;
    next();
  };
}
