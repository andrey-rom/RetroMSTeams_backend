import { z } from "zod";

export const createSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  templateTypeId: z.string().uuid("Invalid template type ID"),
  msTeamsId: z.string().optional(),
  msChannelId: z.string().optional(),
  maxVotesPerUser: z.number().int().min(1).max(99).optional(),
  collectTimerSeconds: z.number().int().min(30).max(3600).optional(),
  voteTimerSeconds: z.number().int().min(30).max(3600).optional(),
});

export const advancePhaseSchema = z.object({
  phase: z.enum(["collect", "vote", "summary"]),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type AdvancePhaseInput = z.infer<typeof advancePhaseSchema>;
