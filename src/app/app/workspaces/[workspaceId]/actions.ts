"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { quickTaskSchema } from "@/lib/tasks/schema";
import { createClient } from "@/lib/supabase/server";

function workspacePath(workspaceId: string) {
  return `/app/workspaces/${workspaceId}`;
}

function tasksPath(workspaceId: string) {
  return `${workspacePath(workspaceId)}/tasks`;
}

function redirectWithDashboardError(workspaceId: string, message: string): never {
  redirect(`${workspacePath(workspaceId)}?error=${encodeURIComponent(message)}`);
}

export async function createDashboardQuickTask(
  workspaceId: string,
  formData: FormData,
) {
  const parsed = quickTaskSchema.safeParse({
    title: String(formData.get("title") ?? ""),
  });

  if (!parsed.success) {
    redirectWithDashboardError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Task could not be created.",
    );
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      title: parsed.data.title,
      created_by: userData.user.id,
      updated_by: userData.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithDashboardError(
      workspaceId,
      error?.message ?? "Task could not be created.",
    );
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userData.user.id,
    task_id: data.id,
    action: "created",
    metadata: { entity: "task", source: "dashboard" },
  });

  revalidatePath(workspacePath(workspaceId));
  revalidatePath(tasksPath(workspaceId));
}
