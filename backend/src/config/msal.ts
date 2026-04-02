import {
  ConfidentialClientApplication,
  type Configuration,
  type AuthenticationResult,
} from "@azure/msal-node";
import { env } from "./env.js";

const msalConfig: Configuration = {
  auth: {
    clientId: env.azure.clientId,
    authority: `https://login.microsoftonline.com/${env.azure.tenantId}`,
    clientSecret: env.azure.clientSecret,
  },
};

let instance: ConfidentialClientApplication | null = null;

export function getMsalInstance(): ConfidentialClientApplication {
  if (!instance) {
    instance = new ConfidentialClientApplication(msalConfig);
  }
  return instance;
}

/**
 * Validates a Teams SSO token via the On-Behalf-Of flow.
 * Returns an AuthenticationResult with an access token scoped
 * to the requested permissions (e.g. User.Read for MS Graph).
 */
export async function exchangeTeamsSsoToken(
  ssoToken: string,
  scopes: string[] = ["User.Read"],
): Promise<AuthenticationResult | null> {
  const client = getMsalInstance();
  return client.acquireTokenOnBehalfOf({
    oboAssertion: ssoToken,
    scopes,
  });
}
