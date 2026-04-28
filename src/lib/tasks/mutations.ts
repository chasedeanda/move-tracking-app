import type { TaskMutationInput } from "@/lib/tasks/schema";

export function buildTaskInsert(
  workspaceId: string,
  userId: string,
  task: TaskMutationInput,
) {
  return {
    workspace_id: workspaceId,
    room_id: task.roomId,
    assignee_id: task.assigneeId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    due_date: task.dueDate,
    start_date: task.startDate,
    notes: task.notes,
    estimated_effort: task.estimatedEffort,
    created_by: userId,
    updated_by: userId,
  };
}

export function buildTaskUpdate(userId: string, task: TaskMutationInput) {
  return {
    room_id: task.roomId,
    assignee_id: task.assigneeId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    due_date: task.dueDate,
    start_date: task.startDate,
    notes: task.notes,
    estimated_effort: task.estimatedEffort,
    updated_by: userId,
  };
}

export function buildTaskCompletionUpdate(
  userId: string,
  nextStatus: "todo" | "done",
) {
  return {
    status: nextStatus,
    updated_by: userId,
  };
}
