import { z } from "zod";

export const createCardSchema = z.object({
  columnKey: z.string().min(1, "columnKey is required"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(500, "Content must be 500 characters or fewer"),
});

export const updateCardSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(500, "Content must be 500 characters or fewer"),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
