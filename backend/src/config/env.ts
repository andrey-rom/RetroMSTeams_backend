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

  azure: {
    tenantId: process.env.AZURE_TENANT_ID || "",
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3978",
} as const;

export function validateEnv(): void {
  const required: Array<[string, string]> = [];

  // Azure AD creds are only needed when real JWT auth is wired up.
  // For POC the app uses devAuth (x-user-id header), so skip that check.
  if (!env.isDev) {
    required.push(["JWT_SECRET", env.jwt.secret]);
  }

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
