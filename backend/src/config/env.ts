// On managed deployments (Railway, Azure) env vars are injected by the platform.
// Only load .env when running locally.
if (!process.env.MANAGED_DEPLOYMENT) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv/config");
}

export const env = {
  port: (process.env.PORT || 3000) as string | number,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3978",
} as const;
