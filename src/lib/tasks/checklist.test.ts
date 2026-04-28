import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/db/types";
import {
  getChecklistGroups,
  inferRoomChecklistCategory,
  isUrgentChecklistTask,
} from "@/lib/tasks/checklist";

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task",
    workspace_id: "workspace",
    room_id: null,
    assignee_id: null,
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
    completed_at: null,
    created_at: overrides.created_at ?? "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  };
}

describe("checklist helpers", () => {
  const today = new Date("2026-04-28T12:00:00.000Z");

  it("treats blocked, critical, overdue, and due-today tasks as urgent", () => {
    expect(isUrgentChecklistTask(task({ status: "blocked" }), today)).toBe(true);
    expect(isUrgentChecklistTask(task({ priority: "critical" }), today)).toBe(true);
    expect(isUrgentChecklistTask(task({ due_date: "2026-04-27" }), today)).toBe(true);
    expect(isUrgentChecklistTask(task({ due_date: "2026-04-28" }), today)).toBe(true);
    expect(
      isUrgentChecklistTask(task({ status: "done", priority: "critical" }), today),
    ).toBe(false);
  });

  it("splits checklist tasks into urgent, open, and done groups", () => {
    const groups = getChecklistGroups(
      [
        task({ id: "done", status: "done" }),
        task({ id: "open", priority: "medium" }),
        task({ id: "urgent", priority: "critical" }),
      ],
      today,
    );

    expect(groups.urgentTasks.map((item) => item.id)).toEqual(["urgent"]);
    expect(groups.openTasks.map((item) => item.id)).toEqual(["open"]);
    expect(groups.doneTasks.map((item) => item.id)).toEqual(["done"]);
    expect(groups.completedCount).toBe(1);
    expect(groups.totalCount).toBe(3);
    expect(groups.completionPercentage).toBe(33);
  });

  it("infers practical default categories for room checklist quick-add", () => {
    expect(inferRoomChecklistCategory("Move Day")).toBe("move_day");
    expect(inferRoomChecklistCategory("Post-Move")).toBe("post_move");
    expect(inferRoomChecklistCategory("Utilities / Admin")).toBe("utilities");
    expect(inferRoomChecklistCategory("Yard / Outdoor")).toBe("cleaning");
    expect(inferRoomChecklistCategory("Garage / Storage")).toBe("donation");
    expect(inferRoomChecklistCategory("Kids Room")).toBe("packing");
  });
});
