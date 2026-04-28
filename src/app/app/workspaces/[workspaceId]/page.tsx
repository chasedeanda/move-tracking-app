import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Home,
  ListChecks,
  MapPin,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ActivityLog, Room, Task, Workspace } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

function getCountdown(moveDate: string) {
  const days = differenceInCalendarDays(parseISO(moveDate), new Date());

  if (days === 0) {
    return "Move day";
  }

  if (days < 0) {
    return `${Math.abs(days)} days since move`;
  }

  return `${days} days to go`;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (error || !workspace) {
    notFound();
  }

  const [roomsResult, tasksResult, membersResult, activityResult] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("sort_order", { ascending: true })
        .returns<Room[]>(),
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("sort_order", { ascending: true })
        .returns<Task[]>(),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id),
      supabase
        .from("activity_log")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<ActivityLog[]>(),
    ]);

  const rooms = roomsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const completion =
    tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const incompleteTasks = tasks.length - doneTasks;
  const memberCount = membersResult.count ?? 0;
  const recentActivity = activityResult.data ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">{getCountdown(workspace.move_date)}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
            {workspace.name}
          </h1>
          <p className="text-muted-foreground">
            Moving {format(parseISO(workspace.move_date), "MMMM d, yyyy")}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completion}%</p>
            <p className="text-sm text-muted-foreground">
              {doneTasks} of {tasks.length} tasks done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" aria-hidden />
              Still open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{incompleteTasks}</p>
            <p className="text-sm text-muted-foreground">Incomplete tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="size-4 text-primary" aria-hidden />
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{rooms.length}</p>
            <p className="text-sm text-muted-foreground">Move areas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" aria-hidden />
              People
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{memberCount}</p>
            <p className="text-sm text-muted-foreground">Workspace members</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" aria-hidden />
              Move details
            </CardTitle>
            <CardDescription>
              This is the shared household command center for this move.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Current address</p>
                <p className="text-sm text-muted-foreground">
                  {workspace.current_address}
                </p>
              </div>
              <div className="space-y-1 rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium">New address</p>
                <p className="text-sm text-muted-foreground">
                  {workspace.new_address}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Starter template ready</p>
                <p className="text-sm text-muted-foreground">
                  {rooms.length} rooms and {tasks.length} tasks are available
                  for the next milestone.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/app/workspaces/new">Create another workspace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" aria-hidden />
              Recent activity
            </CardTitle>
            <CardDescription>Workspace setup events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  className="rounded-xl border bg-background p-3 text-sm"
                  key={activity.id}
                >
                  <p className="font-medium capitalize">{activity.action}</p>
                  <p className="text-muted-foreground">
                    {format(parseISO(activity.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Activity will appear here as the move takes shape.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
