"use server";

import { redirect } from "next/navigation";

import { createWorkspaceSchema } from "@/lib/workspaces/schema";
import { createClient } from "@/lib/supabase/server";

function getFirstError(error: unknown) {
  const parsed = createWorkspaceSchema.safeParse(error);

  if (parsed.success) {
    return null;
  }

  return parsed.error.issues[0]?.message ?? "Check the workspace details.";
}

export async function createWorkspace(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? ""),
    moveDate: String(formData.get("moveDate") ?? ""),
    currentAddress: String(formData.get("currentAddress") ?? ""),
    newAddress: String(formData.get("newAddress") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    seedTemplate: false,
  };

  const parsed = createWorkspaceSchema.safeParse(payload);

  if (!parsed.success) {
    const message = getFirstError(payload) ?? "Check the workspace details.";
    redirect(`/app/workspaces/new?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { data: workspaceId, error } = await supabase.rpc(
    "create_workspace_with_seed",
    {
      p_name: parsed.data.name,
      p_move_date: parsed.data.moveDate,
      p_current_address: parsed.data.currentAddress,
      p_new_address: parsed.data.newAddress,
      p_timezone: parsed.data.timezone,
      p_seed_template: parsed.data.seedTemplate,
    },
  );

  if (error || !workspaceId) {
    const message =
      error?.message ?? "Workspace could not be created. Please try again.";
    redirect(`/app/workspaces/new?error=${encodeURIComponent(message)}`);
  }

  redirect(`/app/workspaces/${workspaceId}/setup/rooms`);
}
