import { describe, expect, it } from "vitest";

import {
  buildTaskCompletionUpdate,
  buildTaskInsert,
  buildTaskUpdate,
} from "@/lib/tasks/mutations";
import { taskMutationSchema } from "@/lib/tasks/schema";

const workspaceId = "7af1fb16-1764-46c4-9e59-bd3d8f8f50e0";
const userId = "6ed88a81-0fdb-401f-8ad8-777204b49f9e";
const roomId = "586193b6-950c-4ac1-b8a7-517774a6ce5e";

describe("task mutation flow helpers", () => {
  it("validates and maps a task create payload to database columns", () => {
    const parsed = taskMutationSchema.parse({
      title: "  Pack the kitchen counter  ",
      description: "Keep coffee supplies out until the morning.",
      status: "todo",
      priority: "high",
      category: "packing",
      roomId,
      assigneeId: userId,
      dueDate: "2026-05-01",
      startDate: "2026-04-29",
      notes: "",
      estimatedEffort: "medium",
    });

    expect(buildTaskInsert(workspaceId, userId, parsed)).toEqual({
      workspace_id: workspaceId,
      room_id: roomId,
      assignee_id: userId,
      title: "Pack the kitchen counter",
      description: "Keep coffee supplies out until the morning.",
      status: "todo",
      priority: "high",
      category: "packing",
      due_date: "2026-05-01",
      start_date: "2026-04-29",
      notes: null,
      estimated_effort: "medium",
      created_by: userId,
      updated_by: userId,
    });
  });

  it("validates and maps an update payload without changing creator fields", () => {
    const parsed = taskMutationSchema.parse({
      title: "Clean bathroom surfaces",
      description: "",
      status: "in_progress",
      priority: "critical",
      category: "cleaning",
      roomId: "",
      assigneeId: "",
      dueDate: "",
      startDate: "",
      notes: "Use the box under the sink.",
      estimatedEffort: "quick",
    });

    expect(buildTaskUpdate(userId, parsed)).toEqual({
      room_id: null,
      assignee_id: null,
      title: "Clean bathroom surfaces",
      description: null,
      status: "in_progress",
      priority: "critical",
      category: "cleaning",
      due_date: null,
      start_date: null,
      notes: "Use the box under the sink.",
      estimated_effort: "quick",
      updated_by: userId,
    });
  });

  it("maps one-tap completion changes to the expected status update", () => {
    expect(buildTaskCompletionUpdate(userId, "done")).toEqual({
      status: "done",
      updated_by: userId,
    });
    expect(buildTaskCompletionUpdate(userId, "todo")).toEqual({
      status: "todo",
      updated_by: userId,
    });
  });

  it("rejects task dates when the start date is after the due date", () => {
    const parsed = taskMutationSchema.safeParse({
      title: "Bad dates",
      description: "",
      status: "todo",
      priority: "medium",
      category: "packing",
      roomId: "",
      assigneeId: "",
      dueDate: "2026-05-01",
      startDate: "2026-05-02",
      notes: "",
      estimatedEffort: "medium",
    });

    expect(parsed.success).toBe(false);
  });
});
