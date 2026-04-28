import { z } from "zod";

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid move date.");

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Workspace name is required.")
    .max(120, "Workspace name must be 120 characters or fewer."),
  moveDate: dateOnlySchema,
  currentAddress: z
    .string()
    .trim()
    .min(1, "Current address is required.")
    .max(500, "Current address must be 500 characters or fewer."),
  newAddress: z
    .string()
    .trim()
    .min(1, "New address is required.")
    .max(500, "New address must be 500 characters or fewer."),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(80, "Timezone must be 80 characters or fewer."),
  seedTemplate: z.boolean(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
