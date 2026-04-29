import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AppHomePage() {
  const supabase = await createClient();
  const { data: acceptedWorkspaceId } = await supabase.rpc(
    "accept_pending_workspace_invitation_for_current_user",
  );

  if (acceptedWorkspaceId) {
    redirect(`/app/workspaces/${acceptedWorkspaceId}/people?message=invite-accepted`);
  }

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  const firstWorkspaceId = workspaces?.[0]?.id;

  if (firstWorkspaceId) {
    redirect(`/app/workspaces/${firstWorkspaceId}`);
  }

  redirect("/app/workspaces/new");
}
