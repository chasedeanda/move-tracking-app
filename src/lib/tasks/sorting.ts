import { differenceInCalendarDays, parseISO, startOfToday } from "date-fns";

import type { Task, TaskPriority, TaskStatus } from "@/lib/db/types";

export type DueBucket = "overdue" | "today" | "next7" | "later" | "none";

const priorityRank: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusRank: Record<TaskStatus, number> = {
  blocked: 0,
  in_progress: 1,
  todo: 2,
  done: 3,
};

export function getDueBucket(
  dueDate: string | null,
  today: Date = startOfToday(),
): DueBucket {
  if (!dueDate) {
    return "none";
  }

  const days = differenceInCalendarDays(parseISO(dueDate), today);

  if (days < 0) {
    return "overdue";
  }

  if (days === 0) {
    return "today";
  }

  if (days <= 7) {
    return "next7";
  }

  return "later";
}

export function sortTasksForDefaultView<T extends Task>(
  tasks: T[],
  today: Date = startOfToday(),
) {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;

    if (aDone !== bDone) {
      return aDone - bDone;
    }

    const aBucket = getDueBucket(a.due_date, today);
    const bBucket = getDueBucket(b.due_date, today);
    const dueRank: Record<DueBucket, number> = {
      overdue: 0,
      today: 1,
      next7: 2,
      later: 3,
      none: 4,
    };

    if (dueRank[aBucket] !== dueRank[bBucket]) {
      return dueRank[aBucket] - dueRank[bBucket];
    }

    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }

    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }

    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.created_at.localeCompare(b.created_at);
  });
}
