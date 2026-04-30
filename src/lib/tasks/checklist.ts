import { startOfToday } from "date-fns";

import type { Task, TaskCategory } from "@/lib/db/types";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";

export type ChecklistGroups<T extends Task> = {
  urgentTasks: T[];
  openTasks: T[];
  doneTasks: T[];
  completedCount: number;
  completionPercentage: number;
  totalCount: number;
};

export type RoomChecklistScope = "mine" | "all";

export function isUrgentChecklistTask(
  task: Task,
  today: Date = startOfToday(),
) {
  const dueBucket = getDueBucket(task.due_date, today);

  return (
    task.status !== "done" &&
    (task.status === "blocked" ||
      task.priority === "critical" ||
      dueBucket === "overdue" ||
      dueBucket === "today")
  );
}

export function getChecklistGroups<T extends Task>(
  tasks: T[],
  today: Date = startOfToday(),
): ChecklistGroups<T> {
  const sortedTasks = sortTasksForDefaultView(tasks, today);
  const urgentTasks = sortedTasks.filter((task) =>
    isUrgentChecklistTask(task, today),
  );
  const urgentTaskIds = new Set(urgentTasks.map((task) => task.id));
  const openTasks = sortedTasks.filter(
    (task) => task.status !== "done" && !urgentTaskIds.has(task.id),
  );
  const doneTasks = sortedTasks.filter((task) => task.status === "done");
  const completedCount = doneTasks.length;
  const totalCount = sortedTasks.length;

  return {
    urgentTasks,
    openTasks,
    doneTasks,
    completedCount,
    completionPercentage:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    totalCount,
  };
}

export function filterRoomChecklistTasks<T extends Task>(
  tasks: T[],
  currentUserId: string,
  scope: RoomChecklistScope = "mine",
) {
  if (scope === "all") {
    return tasks;
  }

  return tasks.filter(
    (task) => !task.assignee_id || task.assignee_id === currentUserId,
  );
}

export function inferRoomChecklistCategory(roomName: string): TaskCategory {
  const normalizedName = roomName.toLowerCase();

  if (normalizedName.includes("move day")) {
    return "move_day";
  }

  if (normalizedName.includes("post-move") || normalizedName.includes("post move")) {
    return "post_move";
  }

  if (normalizedName.includes("utilities")) {
    return "utilities";
  }

  if (normalizedName.includes("admin")) {
    return "admin";
  }

  if (
    normalizedName.includes("yard") ||
    normalizedName.includes("outdoor") ||
    normalizedName.includes("bathroom")
  ) {
    return "cleaning";
  }

  if (
    normalizedName.includes("garage") ||
    normalizedName.includes("storage")
  ) {
    return "donation";
  }

  return "packing";
}
