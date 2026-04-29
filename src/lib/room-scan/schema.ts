import { z } from "zod";

import {
  taskCategories,
  taskEfforts,
  taskPriorities,
} from "@/lib/db/types";

export const roomScanSuggestionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Suggestion title is required.")
    .max(180, "Suggestion title must be 180 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Suggestion description must be 500 characters or fewer.")
    .nullable()
    .default(null),
  category: z.enum(taskCategories),
  priority: z.enum(taskPriorities),
  estimatedEffort: z.enum(taskEfforts),
  reason: z
    .string()
    .trim()
    .min(1, "Suggestion reason is required.")
    .max(300, "Suggestion reason must be 300 characters or fewer."),
});

export const roomScanResponseSchema = z.object({
  roomSummary: z
    .string()
    .trim()
    .min(1, "Room summary is required.")
    .max(700, "Room summary must be 700 characters or fewer."),
  suggestions: z.array(roomScanSuggestionSchema).min(1).max(12),
});

export const roomScanGenerateRequestSchema = z.object({
  notes: z.string().trim().max(2000).default(""),
  images: z
    .array(
      z
        .string()
        .startsWith("data:image/")
        .refine(
          (value) =>
            /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
              value,
            ),
          "Images must be JPEG, PNG, or WebP data URLs.",
        ),
    )
    .min(1, "Add at least one room photo.")
    .max(4, "Add no more than four photos.")
    .refine(
      (images) => images.reduce((sum, image) => sum + image.length, 0) <= 5_600_000,
      "Images are too large. Try fewer or smaller photos.",
    ),
});

export const createRoomScanTasksRequestSchema = z.object({
  suggestions: z.array(roomScanSuggestionSchema).min(1).max(12),
});

export type RoomScanSuggestion = z.infer<typeof roomScanSuggestionSchema>;
export type RoomScanResponse = z.infer<typeof roomScanResponseSchema>;

