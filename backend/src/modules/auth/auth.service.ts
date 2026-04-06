import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { exchangeTeamsSsoToken } from "../../config/msal.js";
import { AppError } from "../../shared/errors/app-error.js";

interface TeamsTokenClaims extends JwtPayload {
  oid?: string;
  tid?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;
}

export interface AppAuthTokenPayload extends JwtPayload {
  sub: string;
  oid: string;
  tid?: string;
  name?: string;
  username?: string;
}

interface ExchangeResult {
  token: string;
  user: {
    id: string;
    tenantId?: string;
    name?: string;
    username?: string;
  };
  expiresIn: string;
}

function decodeTeamsClaims(token: string): TeamsTokenClaims {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") {
    throw new AppError("Invalid Teams SSO token", 401, "INVALID_SSO_TOKEN");
  }

  return decoded as TeamsTokenClaims;
}

function getJwtSignOptions(): SignOptions {
  return {
    expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"],
    issuer: "retro-bot-backend",
    audience: env.jwt.audience,
  };
}

export async function exchangeTeamsToken(ssoToken: string): Promise<ExchangeResult> {
  const authResult = await exchangeTeamsSsoToken(ssoToken);
  if (!authResult?.accessToken) {
    throw new AppError("Unable to validate Teams SSO token", 401, "AZURE_AUTH_FAILED");
  }

  const claims = decodeTeamsClaims(ssoToken);
  const oid = claims.oid;
  if (!oid) {
    throw new AppError("Teams token is missing oid claim", 401, "INVALID_SSO_TOKEN");
  }

  const payload: AppAuthTokenPayload = {
    sub: oid,
    oid,
    tid: claims.tid,
    name: claims.name,
    username: claims.preferred_username || claims.upn,
  };

  const token = jwt.sign(payload, env.jwt.secret, getJwtSignOptions());

  return {
    token,
    user: {
      id: oid,
      tenantId: claims.tid,
      name: claims.name,
      username: claims.preferred_username || claims.upn,
    },
    expiresIn: env.jwt.expiresIn,
  };
}

export function verifyAppToken(token: string): AppAuthTokenPayload {
  const payload = jwt.verify(token, env.jwt.secret, {
    issuer: "retro-bot-backend",
    audience: env.jwt.audience,
  });

  if (!payload || typeof payload === "string" || !payload.sub || !payload.oid) {
    throw new AppError("Invalid application token", 401, "INVALID_APP_TOKEN");
  }

  return payload as AppAuthTokenPayload;
}
