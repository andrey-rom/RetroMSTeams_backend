import { z } from "zod";

export const exchangeTeamsTokenSchema = z.object({
  ssoToken: z.string().min(1, "ssoToken is required"),
});

export type ExchangeTeamsTokenInput = z.infer<typeof exchangeTeamsTokenSchema>;
