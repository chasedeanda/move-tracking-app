import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays, Home, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Workspace, WorkspaceMember } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    notFound();
  }

  const [workspaceResult, memberResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single<Workspace>(),
    supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .single<WorkspaceMember>(),
  ]);

  if (workspaceResult.error || !workspaceResult.data) {
    notFound();
  }

  const workspace = workspaceResult.data;
  const member = memberResult.data;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}`}>
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="space-y-2">
          <Badge variant="secondary">{workspace.name}</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Settings</h1>
          <p className="text-muted-foreground">
            Review the move details and manage collaborators from People.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="size-5 text-primary" aria-hidden />
              Move workspace
            </CardTitle>
            <CardDescription>
              Workspace editing is intentionally minimal for the MVP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Move date</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(parseISO(workspace.move_date), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Timezone</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {workspace.timezone}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4" aria-hidden />
                  Current address
                </p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {workspace.current_address}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4" aria-hidden />
                  New address
                </p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {workspace.new_address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden />
              Access
            </CardTitle>
            <CardDescription>
              Membership changes are enforced by Supabase RLS and owner-only RPCs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm font-medium">Your role</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {member?.role ?? "member"}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href={`/app/workspaces/${workspaceId}/people`}>
                <Users aria-hidden="true" />
                Manage people
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden />
            Workspace settings can be expanded after the MVP.
          </span>
          <Button asChild variant="outline">
            <Link href={`/app/workspaces/${workspaceId}/tasks`}>Open tasks</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
