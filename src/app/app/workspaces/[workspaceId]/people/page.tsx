import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Mail,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import {
  addWorkspaceMember,
  removeWorkspaceMember,
} from "@/app/app/workspaces/[workspaceId]/people/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile, Task, Workspace, WorkspaceMember } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { getDueBucket } from "@/lib/tasks/sorting";

type PeoplePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type MemberView = WorkspaceMember & {
  profile: Profile | null;
};

function memberName(member: MemberView) {
  return member.profile?.display_name || member.profile?.email || "Household member";
}

function memberStats(member: MemberView, tasks: Task[]) {
  const assigned = tasks.filter((task) => task.assignee_id === member.user_id);
  const completed = assigned.filter((task) => task.status === "done");
  const incomplete = assigned.filter((task) => task.status !== "done");
  const overdue = incomplete.filter(
    (task) => getDueBucket(task.due_date) === "overdue",
  );

  return {
    assignedIncomplete: incomplete.length,
    completed: completed.length,
    overdue: overdue.length,
  };
}

export default async function PeoplePage({ params, searchParams }: PeoplePageProps) {
  const { workspaceId } = await params;
  const { error: pageError } = await searchParams;
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    notFound();
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  const [membersResult, tasksResult] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true })
      .returns<WorkspaceMember[]>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .returns<Task[]>(),
  ]);
  const membersRaw = membersResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const profileIds = membersRaw.map((member) => member.user_id);
  const profilesResult =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds)
          .returns<Profile[]>()
      : { data: [] as Profile[] };
  const profilesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );
  const members: MemberView[] = membersRaw.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? null,
  }));
  const currentMember = members.find((member) => member.user_id === userData.user.id);
  const isOwner = currentMember?.role === "owner";
  const unassignedIncomplete = tasks.filter(
    (task) => task.status !== "done" && !task.assignee_id,
  ).length;

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
          <h1 className="text-3xl font-semibold tracking-normal">People</h1>
          <p className="text-muted-foreground">
            See who owns what and where work is getting stuck.
          </p>
        </div>
      </section>

      {pageError ? (
        <Alert variant="destructive">
          <AlertTitle>Member change failed</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden />
              Collaborators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{members.length}</p>
            <p className="text-sm text-muted-foreground">Workspace members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-primary" aria-hidden />
              Unassigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{unassignedIncomplete}</p>
            <p className="text-sm text-muted-foreground">Open tasks need owners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              Overdue assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {members.reduce((sum, member) => sum + memberStats(member, tasks).overdue, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Across all people</p>
          </CardContent>
        </Card>
      </div>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Add collaborator</CardTitle>
            <CardDescription>
              Add an existing signed-in user by email. Invitation email flow is
              outside this MVP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={addWorkspaceMember.bind(null, workspaceId)}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <label className="sr-only" htmlFor="member-email">
                Collaborator email
              </label>
              <Input
                className="min-h-12 flex-1"
                id="member-email"
                name="email"
                placeholder="roommate@example.com"
                required
                type="email"
              />
              <Button className="min-h-12">
                <Plus aria-hidden="true" />
                Add member
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTitle>Member management is owner-only</AlertTitle>
          <AlertDescription>
            You can see workload, but only workspace owners can add or remove
            collaborators.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {members.map((member) => {
          const stats = memberStats(member, tasks);

          return (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-lg">
                      {memberName(member)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden />
                      {member.profile?.email ?? "No email available"}
                    </CardDescription>
                  </div>
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/55 p-3">
                    <p className="text-xl font-semibold">{stats.assignedIncomplete}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                  <div className="rounded-xl bg-muted/55 p-3">
                    <p className="text-xl font-semibold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Done</p>
                  </div>
                  <div className="rounded-xl bg-muted/55 p-3">
                    <p className="text-xl font-semibold">{stats.overdue}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>

                {isOwner && member.role === "member" ? (
                  <form
                    action={removeWorkspaceMember.bind(
                      null,
                      workspaceId,
                      member.user_id,
                    )}
                  >
                    <Button className="w-full" variant="outline">
                      <Trash2 aria-hidden="true" />
                      Remove member
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
