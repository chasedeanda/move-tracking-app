import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/app?message=missing-invitation");
  }

  const supabase = await createClient();
  const { data: workspaceId, error } = await supabase.rpc(
    "accept_workspace_invitation",
    {
      p_token: token,
    },
  );

  if (error || !workspaceId) {
    redirect(`/app?message=${encodeURIComponent(error?.message ?? "Invitation could not be accepted.")}`);
  }

  redirect(`/app/workspaces/${workspaceId}/people?message=invite-accepted`);
}
