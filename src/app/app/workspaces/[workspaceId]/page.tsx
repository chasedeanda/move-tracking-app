import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Home,
  ListChecks,
  Plus,
  UserRoundX,
} from "lucide-react";

import { createDashboardQuickTask } from "@/app/app/workspaces/[workspaceId]/actions";
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
import type { ActivityLog, Room, Task, Workspace } from "@/lib/db/types";
import {
  getDashboardKpis,
  getRoomProgress,
  getUpcomingTasks,
} from "@/lib/dashboard/kpis";
import { createClient } from "@/lib/supabase/server";
import { getDueBucket } from "@/lib/tasks/sorting";
import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function countdownLabel(days: number) {
  if (days === 0) {
    return "Move day";
  }

  if (days < 0) {
    return `${Math.abs(days)} days since move`;
  }

  return `${days} days to go`;
}

function activityLabel(activity: ActivityLog) {
  const action = activity.action.charAt(0).toUpperCase() + activity.action.slice(1);
  const entity =
    typeof activity.metadata.entity === "string"
      ? activity.metadata.entity
      : "workspace";

  return `${action} ${entity}`;
}

function dueLabel(task: Task) {
  if (!task.due_date) {
    return null;
  }

  const bucket = getDueBucket(task.due_date);

  if (bucket === "overdue") {
    return {
      text: `Overdue ${format(parseISO(task.due_date), "MMM d")}`,
      variant: "destructive" as const,
    };
  }

  if (bucket === "today") {
    return { text: "Due today", variant: "destructive" as const };
  }

  if (bucket === "next7") {
    return {
      text: `Due ${format(parseISO(task.due_date), "MMM d")}`,
      variant: "secondary" as const,
    };
  }

  return {
    text: `Due ${format(parseISO(task.due_date), "MMM d")}`,
    variant: "outline" as const,
  };
}

function priorityClass(priority: Task["priority"]) {
  if (priority === "critical") {
    return "text-destructive";
  }

  if (priority === "high") {
    return "text-amber-700";
  }

  return "text-muted-foreground";
}

export default async function WorkspacePage({
  params,
  searchParams,
}: WorkspacePageProps) {
  const { workspaceId } = await params;
  const { error: pageError } = await searchParams;
  const supabase = await createClient();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (error || !workspace) {
    notFound();
  }

  const [roomsResult, tasksResult, activityResult] = await Promise.all([
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
      .returns<Task[]>(),
    supabase
      .from("activity_log")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ActivityLog[]>(),
  ]);

  const rooms = roomsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const recentActivity = activityResult.data ?? [];
  const kpis = getDashboardKpis(tasks, workspace.move_date);
  const upcomingTasks = getUpcomingTasks(tasks, 6);
  const roomsNeedingAttention = getRoomProgress(rooms, tasks)
    .filter((room) => room.incompleteTasks > 0)
    .slice(0, 5);

  const kpiCards = [
    {
      title: "Completion",
      value: `${kpis.completionPercentage}%`,
      detail: `${kpis.completedTasks} of ${kpis.totalTasks} tasks done`,
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      title: "Still open",
      value: kpis.incompleteTasks,
      detail: "Incomplete tasks",
      icon: ListChecks,
      tone: "text-primary",
    },
    {
      title: "Overdue",
      value: kpis.overdueTasks,
      detail: "Needs attention",
      icon: AlertTriangle,
      tone: kpis.overdueTasks > 0 ? "text-destructive" : "text-primary",
    },
    {
      title: "Next 7 days",
      value: kpis.dueNextSevenDays,
      detail: "Due soon",
      icon: Clock3,
      tone: kpis.dueNextSevenDays > 0 ? "text-amber-700" : "text-primary",
    },
    {
      title: "Unassigned",
      value: kpis.unassignedTasks,
      detail: "Needs an owner",
      icon: UserRoundX,
      tone: kpis.unassignedTasks > 0 ? "text-amber-700" : "text-primary",
    },
    {
      title: "Countdown",
      value: countdownLabel(kpis.moveCountdownDays),
      detail: format(parseISO(workspace.move_date), "MMM d, yyyy"),
      icon: CalendarDays,
      tone: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">{countdownLabel(kpis.moveCountdownDays)}</Badge>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
              {workspace.name}
            </h1>
            <p className="text-muted-foreground">
              Moving {format(parseISO(workspace.move_date), "MMMM d, yyyy")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/app/workspaces/${workspace.id}/tasks`}>
              <ListChecks aria-hidden="true" />
              Open tasks
            </Link>
          </Button>
        </div>
      </section>

      {pageError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard action failed</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <form
            action={createDashboardQuickTask.bind(null, workspace.id)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="dashboard-quick-task">
              Quick add task
            </label>
            <Input
              className="min-h-12 flex-1"
              id="dashboard-quick-task"
              maxLength={180}
              name="title"
              placeholder="Add something that needs doing..."
              required
            />
            <Button className="min-h-12">
              <Plus aria-hidden="true" />
              Add task
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <card.icon className={cn("size-4", card.tone)} aria-hidden />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-primary" aria-hidden />
              Upcoming tasks
            </CardTitle>
            <CardDescription>
              Ordered by urgency, priority, and household sort order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => {
                const due = dueLabel(task);

                return (
                  <Link
                    className="block rounded-xl border bg-background p-4 transition-colors hover:bg-accent/60"
                    href={`/app/workspaces/${workspace.id}/tasks`}
                    key={task.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="break-words font-medium">{task.title}</p>
                        <p className={cn("text-sm", priorityClass(task.priority))}>
                          {task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)}{" "}
                          priority
                        </p>
                      </div>
                      {due ? <Badge variant={due.variant}>{due.text}</Badge> : null}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No upcoming dated tasks. Add due dates from the task list when
                timing starts to matter.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="size-5 text-primary" aria-hidden />
              Rooms needing attention
            </CardTitle>
            <CardDescription>Rooms with open or overdue work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomsNeedingAttention.length > 0 ? (
              roomsNeedingAttention.map((roomProgress) => (
                <Link
                  className="block space-y-2 rounded-xl border bg-background p-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/app/workspaces/${workspace.id}/rooms/${roomProgress.room.id}`}
                  key={roomProgress.room.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{roomProgress.room.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {roomProgress.incompleteTasks} open
                        {roomProgress.overdueTasks > 0
                          ? `, ${roomProgress.overdueTasks} overdue`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {roomProgress.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        roomProgress.overdueTasks > 0
                          ? "bg-destructive"
                          : "bg-primary",
                      )}
                      style={{
                        width: `${roomProgress.completionPercentage}%`,
                      }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No room has open work right now.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest shared workspace changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 text-sm"
                key={activity.id}
              >
                <span className="font-medium">{activityLabel(activity)}</span>
                <span className="shrink-0 text-muted-foreground">
                  {format(parseISO(activity.created_at), "MMM d, h:mm a")}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Activity will appear here as tasks change.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
