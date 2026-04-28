import { describe, expect, it } from "vitest";

import type { Room, Task } from "@/lib/db/types";
import {
  getDashboardKpis,
  getMoveCountdownDays,
  getRoomProgress,
  getUpcomingTasks,
} from "@/lib/dashboard/kpis";

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task",
    workspace_id: "workspace",
    room_id: overrides.room_id ?? null,
    assignee_id: overrides.assignee_id ?? null,
    title: overrides.title ?? "Task",
    description: null,
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "medium",
    category: overrides.category ?? "packing",
    due_date: overrides.due_date ?? null,
    start_date: null,
    notes: null,
    estimated_effort: "medium",
    sort_order: overrides.sort_order ?? 0,
    created_by: "user",
    updated_by: null,
    completed_at: overrides.status === "done" ? "2026-04-28T00:00:00.000Z" : null,
    created_at: overrides.created_at ?? "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };
}

function room(overrides: Partial<Room>): Room {
  return {
    id: overrides.id ?? "room",
    workspace_id: "workspace",
    name: overrides.name ?? "Room",
    sort_order: overrides.sort_order ?? 0,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };
}

describe("dashboard KPI helpers", () => {
  const today = new Date("2026-04-28T12:00:00.000Z");

  it("calculates completion, urgency, assignment, and countdown metrics", () => {
    const kpis = getDashboardKpis(
      [
        task({ id: "done", status: "done", due_date: "2026-04-20" }),
        task({ id: "overdue", due_date: "2026-04-27" }),
        task({ id: "today", due_date: "2026-04-28", assignee_id: "user" }),
        task({ id: "soon", due_date: "2026-05-05" }),
        task({ id: "later", due_date: "2026-05-10", assignee_id: "user" }),
      ],
      "2026-05-03",
      today,
    );

    expect(kpis).toEqual({
      completionPercentage: 20,
      totalTasks: 5,
      completedTasks: 1,
      incompleteTasks: 4,
      overdueTasks: 1,
      dueNextSevenDays: 2,
      unassignedTasks: 2,
      moveCountdownDays: 5,
    });
  });

  it("returns upcoming incomplete tasks with due dates in default task order", () => {
    const upcoming = getUpcomingTasks(
      [
        task({ id: "done", status: "done", due_date: "2026-04-27", priority: "critical" }),
        task({ id: "later", due_date: "2026-05-20", priority: "critical" }),
        task({ id: "overdue", due_date: "2026-04-27", priority: "low" }),
        task({ id: "soon", due_date: "2026-05-01", priority: "high" }),
        task({ id: "none", due_date: null, priority: "critical" }),
      ],
      3,
      today,
    );

    expect(upcoming.map((item) => item.id)).toEqual([
      "overdue",
      "soon",
      "later",
    ]);
  });

  it("sorts room progress by overdue and incomplete work", () => {
    const rooms = [
      room({ id: "living", name: "Living Room", sort_order: 10 }),
      room({ id: "kitchen", name: "Kitchen", sort_order: 20 }),
    ];

    const progress = getRoomProgress(
      rooms,
      [
        task({ id: "living-overdue", room_id: "living", due_date: "2026-04-27" }),
        task({ id: "living-done", room_id: "living", status: "done" }),
        task({ id: "kitchen-open", room_id: "kitchen" }),
        task({ id: "kitchen-open-2", room_id: "kitchen" }),
      ],
      today,
    );

    expect(progress[0]).toMatchObject({
      room: expect.objectContaining({ id: "living" }),
      totalTasks: 2,
      completedTasks: 1,
      incompleteTasks: 1,
      overdueTasks: 1,
      completionPercentage: 50,
    });
  });

  it("calculates countdown days from the move date", () => {
    expect(getMoveCountdownDays("2026-04-28", today)).toBe(0);
    expect(getMoveCountdownDays("2026-05-01", today)).toBe(3);
    expect(getMoveCountdownDays("2026-04-20", today)).toBe(-8);
  });
});
