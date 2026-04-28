import { addDays, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

import type { Room, Task } from "@/lib/db/types";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";

export type DashboardKpis = {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  overdueTasks: number;
  dueNextSevenDays: number;
  unassignedTasks: number;
  moveCountdownDays: number;
};

export type RoomProgress = {
  room: Room;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  overdueTasks: number;
  completionPercentage: number;
};

export function getMoveCountdownDays(moveDate: string, today = new Date()) {
  return differenceInCalendarDays(parseISO(moveDate), startOfDay(today));
}

export function getDashboardKpis(
  tasks: Task[],
  moveDate: string,
  today = new Date(),
): DashboardKpis {
  const normalizedToday = startOfDay(today);
  const nextSevenDays = addDays(normalizedToday, 7);
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const incomplete = tasks.filter((task) => task.status !== "done");
  const overdueTasks = incomplete.filter(
    (task) => getDueBucket(task.due_date, normalizedToday) === "overdue",
  ).length;
  const dueNextSevenDays = incomplete.filter((task) => {
    if (!task.due_date) {
      return false;
    }

    const dueDate = parseISO(task.due_date);
    return dueDate >= normalizedToday && dueDate <= nextSevenDays;
  }).length;
  const unassignedTasks = incomplete.filter((task) => !task.assignee_id).length;

  return {
    completionPercentage:
      tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
    totalTasks: tasks.length,
    completedTasks,
    incompleteTasks: incomplete.length,
    overdueTasks,
    dueNextSevenDays,
    unassignedTasks,
    moveCountdownDays: getMoveCountdownDays(moveDate, normalizedToday),
  };
}

export function getUpcomingTasks(tasks: Task[], limit = 6, today = new Date()) {
  return sortTasksForDefaultView(
    tasks.filter((task) => task.status !== "done"),
    startOfDay(today),
  )
    .filter((task) => task.due_date !== null)
    .slice(0, limit);
}

export function getRoomProgress(
  rooms: Room[],
  tasks: Task[],
  today = new Date(),
): RoomProgress[] {
  const normalizedToday = startOfDay(today);

  return rooms
    .map((room) => {
      const roomTasks = tasks.filter((task) => task.room_id === room.id);
      const completedTasks = roomTasks.filter((task) => task.status === "done").length;
      const incompleteTasks = roomTasks.length - completedTasks;
      const overdueTasks = roomTasks.filter(
        (task) =>
          task.status !== "done" &&
          getDueBucket(task.due_date, normalizedToday) === "overdue",
      ).length;

      return {
        room,
        totalTasks: roomTasks.length,
        completedTasks,
        incompleteTasks,
        overdueTasks,
        completionPercentage:
          roomTasks.length > 0
            ? Math.round((completedTasks / roomTasks.length) * 100)
            : 0,
      };
    })
    .sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) {
        return b.overdueTasks - a.overdueTasks;
      }

      if (a.incompleteTasks !== b.incompleteTasks) {
        return b.incompleteTasks - a.incompleteTasks;
      }

      return a.room.sort_order - b.room.sort_order;
    });
}
