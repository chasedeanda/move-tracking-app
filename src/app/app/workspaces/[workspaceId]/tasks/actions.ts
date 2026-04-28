"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  quickTaskSchema,
  subtaskMutationSchema,
  taskMutationSchema,
} from "@/lib/tasks/schema";
import { createClient } from "@/lib/supabase/server";

function tasksPath(workspaceId: string) {
  return `/app/workspaces/${workspaceId}/tasks`;
}

function redirectWithError(workspaceId: string, message: string): never {
  redirect(`${tasksPath(workspaceId)}?error=${encodeURIComponent(message)}`);
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { supabase, userId: data.user.id };
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function parseTaskForm(formData: FormData) {
  return taskMutationSchema.safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status") || "todo",
    priority: formValue(formData, "priority") || "medium",
    category: formValue(formData, "category") || "packing",
    roomId: formValue(formData, "roomId"),
    assigneeId: formValue(formData, "assigneeId"),
    dueDate: formValue(formData, "dueDate"),
    startDate: formValue(formData, "startDate"),
    notes: formValue(formData, "notes"),
    estimatedEffort: formValue(formData, "estimatedEffort") || "medium",
  });
}

async function logTaskActivity(
  workspaceId: string,
  taskId: string | null,
  action: "created" | "updated" | "completed" | "deleted" | "assigned",
) {
  const { supabase, userId } = await getCurrentUserId();
  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userId,
    task_id: taskId,
    action,
    metadata: { entity: "task" },
  });
}

export async function createQuickTask(workspaceId: string, formData: FormData) {
  const parsed = quickTaskSchema.safeParse({
    title: formValue(formData, "title"),
  });

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Task could not be created.",
    );
  }

  const { supabase, userId } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      title: parsed.data.title,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(workspaceId, error?.message ?? "Task could not be created.");
  }

  await logTaskActivity(workspaceId, data.id, "created");
  revalidatePath(tasksPath(workspaceId));
}

export async function createTask(workspaceId: string, formData: FormData) {
  const parsed = parseTaskForm(formData);

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Task could not be created.",
    );
  }

  const { supabase, userId } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      room_id: parsed.data.roomId,
      assignee_id: parsed.data.assigneeId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      category: parsed.data.category,
      due_date: parsed.data.dueDate,
      start_date: parsed.data.startDate,
      notes: parsed.data.notes,
      estimated_effort: parsed.data.estimatedEffort,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(workspaceId, error?.message ?? "Task could not be created.");
  }

  await logTaskActivity(workspaceId, data.id, "created");
  revalidatePath(tasksPath(workspaceId));
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  formData: FormData,
) {
  const parsed = parseTaskForm(formData);

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Task could not be updated.",
    );
  }

  const { supabase, userId } = await getCurrentUserId();
  const { error } = await supabase
    .from("tasks")
    .update({
      room_id: parsed.data.roomId,
      assignee_id: parsed.data.assigneeId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      category: parsed.data.category,
      due_date: parsed.data.dueDate,
      start_date: parsed.data.startDate,
      notes: parsed.data.notes,
      estimated_effort: parsed.data.estimatedEffort,
      updated_by: userId,
    })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  await logTaskActivity(workspaceId, taskId, "updated");
  revalidatePath(tasksPath(workspaceId));
}

export async function assignTask(
  workspaceId: string,
  taskId: string,
  formData: FormData,
) {
  const assigneeId = formValue(formData, "assigneeId") || null;
  const { supabase, userId } = await getCurrentUserId();
  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId, updated_by: userId })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  await logTaskActivity(workspaceId, taskId, "assigned");
  revalidatePath(tasksPath(workspaceId));
}

export async function toggleTaskComplete(
  workspaceId: string,
  taskId: string,
  nextStatus: "todo" | "done",
) {
  const { supabase, userId } = await getCurrentUserId();
  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus, updated_by: userId })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  await logTaskActivity(
    workspaceId,
    taskId,
    nextStatus === "done" ? "completed" : "updated",
  );
  revalidatePath(tasksPath(workspaceId));
}

export async function deleteTask(workspaceId: string, taskId: string) {
  const { supabase } = await getCurrentUserId();
  await logTaskActivity(workspaceId, taskId, "deleted");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(tasksPath(workspaceId));
}

export async function createSubtask(
  workspaceId: string,
  taskId: string,
  formData: FormData,
) {
  const parsed = subtaskMutationSchema.safeParse({
    title: formValue(formData, "title"),
  });

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Subtask could not be created.",
    );
  }

  const { supabase } = await getCurrentUserId();
  const { error } = await supabase.from("subtasks").insert({
    workspace_id: workspaceId,
    task_id: taskId,
    title: parsed.data.title,
  });

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(tasksPath(workspaceId));
}

export async function updateSubtask(
  workspaceId: string,
  subtaskId: string,
  formData: FormData,
) {
  const parsed = subtaskMutationSchema.safeParse({
    title: formValue(formData, "title"),
  });

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Subtask could not be updated.",
    );
  }

  const { supabase } = await getCurrentUserId();
  const { error } = await supabase
    .from("subtasks")
    .update({ title: parsed.data.title })
    .eq("id", subtaskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(tasksPath(workspaceId));
}

export async function toggleSubtask(
  workspaceId: string,
  subtaskId: string,
  isDone: boolean,
) {
  const { supabase } = await getCurrentUserId();
  const { error } = await supabase
    .from("subtasks")
    .update({ is_done: isDone })
    .eq("id", subtaskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(tasksPath(workspaceId));
}

export async function deleteSubtask(workspaceId: string, subtaskId: string) {
  const { supabase } = await getCurrentUserId();
  const { error } = await supabase
    .from("subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(tasksPath(workspaceId));
}
