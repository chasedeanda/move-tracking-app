"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const addMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

function peoplePath(workspaceId: string) {
  return `/app/workspaces/${workspaceId}/people`;
}

function redirectWithError(workspaceId: string, message: string): never {
  redirect(`${peoplePath(workspaceId)}?error=${encodeURIComponent(message)}`);
}

export async function addWorkspaceMember(
  workspaceId: string,
  formData: FormData,
) {
  const parsed = addMemberSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Member could not be added.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_workspace_member_by_email", {
    p_workspace_id: workspaceId,
    p_email: parsed.data.email,
    p_role: "member",
  });

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  revalidatePath(peoplePath(workspaceId));
}

export async function removeWorkspaceMember(
  workspaceId: string,
  memberUserId: string,
) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  if (memberUserId === userData.user.id) {
    redirectWithError(workspaceId, "Owners cannot remove themselves in this MVP.");
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId)
    .eq("role", "member");

  if (error) {
    redirectWithError(workspaceId, error.message);
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userData.user.id,
    action: "updated",
    metadata: { entity: "member", removed_user_id: memberUserId },
  });

  revalidatePath(peoplePath(workspaceId));
}
