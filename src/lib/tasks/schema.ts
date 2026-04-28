import { z } from "zod";

import {
  taskCategories,
  taskEfforts,
  taskPriorities,
  taskStatuses,
} from "@/lib/db/types";

const nullableUuidSchema = z
  .string()
  .trim()
  .uuid()
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value));

const nullableDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value));

const nullableTextSchema = z
  .string()
  .trim()
  .max(2000, "Keep this field under 2,000 characters.")
  .transform((value) => (value === "" ? null : value));

export const taskMutationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required.")
      .max(180, "Task title must be 180 characters or fewer."),
    description: nullableTextSchema,
    status: z.enum(taskStatuses),
    priority: z.enum(taskPriorities),
    category: z.enum(taskCategories),
    roomId: nullableUuidSchema,
    assigneeId: nullableUuidSchema,
    dueDate: nullableDateSchema,
    startDate: nullableDateSchema,
    notes: nullableTextSchema,
    estimatedEffort: z.enum(taskEfforts),
  })
  .refine(
    (value) =>
      !value.startDate || !value.dueDate || value.startDate <= value.dueDate,
    {
      message: "Start date must be before or on the due date.",
      path: ["startDate"],
    },
  );

export const quickTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(180, "Task title must be 180 characters or fewer."),
});

export const subtaskMutationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Subtask title is required.")
    .max(180, "Subtask title must be 180 characters or fewer."),
});

export type TaskMutationInput = z.infer<typeof taskMutationSchema>;
