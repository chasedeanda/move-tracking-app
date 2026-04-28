import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/db/types";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";

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

describe("task sorting helpers", () => {
  const today = new Date("2026-04-28T12:00:00.000Z");

  it("groups due dates into required buckets", () => {
    expect(getDueBucket(null, today)).toBe("none");
    expect(getDueBucket("2026-04-27", today)).toBe("overdue");
    expect(getDueBucket("2026-04-28", today)).toBe("today");
    expect(getDueBucket("2026-05-03", today)).toBe("next7");
    expect(getDueBucket("2026-05-20", today)).toBe("later");
  });

  it("sorts incomplete, overdue, soon, priority, manual order, and created date", () => {
    const sorted = sortTasksForDefaultView(
      [
        task({ id: "done-overdue", status: "done", priority: "critical", due_date: "2026-04-20" }),
        task({ id: "later-critical", priority: "critical", due_date: "2026-05-20" }),
        task({ id: "soon-low", priority: "low", due_date: "2026-05-02" }),
        task({ id: "overdue-low", priority: "low", due_date: "2026-04-20" }),
        task({ id: "overdue-high", priority: "high", due_date: "2026-04-20" }),
        task({ id: "manual-2", priority: "medium", sort_order: 2, created_at: "2026-04-01T00:00:00.000Z" }),
        task({ id: "manual-1", priority: "medium", sort_order: 1, created_at: "2026-04-02T00:00:00.000Z" }),
      ],
      today,
    );

    expect(sorted.map((item) => item.id)).toEqual([
      "overdue-high",
      "overdue-low",
      "soon-low",
      "later-critical",
      "manual-1",
      "manual-2",
      "done-overdue",
    ]);
  });
});
