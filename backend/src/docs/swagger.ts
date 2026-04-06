import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";

export function setupSwaggerUi(app: Express): void {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument as Record<string, unknown>, {
      customSiteTitle: "Retro Bot API",
      customCss: ".swagger-ui .topbar { display: none }",
    }),
  );
}
