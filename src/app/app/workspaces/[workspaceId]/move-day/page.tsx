import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Plus,
} from "lucide-react";

import {
  createTask,
  toggleTaskComplete,
} from "@/app/app/workspaces/[workspaceId]/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Room, Task, Workspace } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";
import { cn } from "@/lib/utils";

type MoveDayPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dueLabel(task: Task) {
  if (!task.due_date) {
    return null;
  }

  const bucket = getDueBucket(task.due_date);
  const dateLabel = format(parseISO(task.due_date), "MMM d");

  if (bucket === "overdue") {
    return { text: `Overdue ${dateLabel}`, urgent: true };
  }

  if (bucket === "today") {
    return { text: "Due today", urgent: true };
  }

  return { text: `Due ${dateLabel}`, urgent: false };
}

function MoveDayTaskCard({
  task,
  workspaceId,
}: {
  task: Task;
  workspaceId: string;
}) {
  const due = dueLabel(task);
  const isDone = task.status === "done";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isDone && "bg-muted/45 opacity-80",
        due?.urgent && !isDone && "border-destructive/50",
      )}
    >
      <CardContent className="flex gap-4 p-4">
        <form
          action={toggleTaskComplete.bind(
            null,
            workspaceId,
            task.id,
            isDone ? "todo" : "done",
          )}
        >
          <Button
            aria-label={isDone ? "Mark move-day task incomplete" : "Complete move-day task"}
            className="size-14 rounded-full"
            size="icon"
            variant={isDone ? "secondary" : "outline"}
          >
            {isDone ? (
              <CheckCircle2 className="size-6" aria-hidden />
            ) : (
              <Circle className="size-6" aria-hidden />
            )}
          </Button>
        </form>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2
              className={cn(
                "break-words text-lg font-semibold leading-snug",
                isDone && "line-through",
              )}
            >
              {task.title}
            </h2>
            {task.description ? (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {task.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={task.priority === "critical" ? "destructive" : "secondary"}>
              {labelFromValue(task.priority)}
            </Badge>
            {task.status === "blocked" ? (
              <Badge variant="destructive">Blocked</Badge>
            ) : null}
            {due ? (
              <Badge variant={due.urgent ? "destructive" : "outline"}>
                <CalendarClock aria-hidden="true" />
                {due.text}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MoveDayPage({ params }: MoveDayPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  const [roomsResult, tasksResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .returns<Room[]>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .returns<Task[]>(),
  ]);
  const moveDayRoom = (roomsResult.data ?? []).find(
    (room) => room.name.toLowerCase() === "move day",
  );
  const moveDayTasks = sortTasksForDefaultView(
    (tasksResult.data ?? []).filter(
      (task) =>
        task.category === "move_day" ||
        (moveDayRoom ? task.room_id === moveDayRoom.id : false),
    ),
  );
  const urgentTasks = moveDayTasks.filter((task) => {
    const due = getDueBucket(task.due_date);
    return task.status !== "done" && (task.priority === "critical" || due === "overdue" || due === "today");
  });
  const openTasks = moveDayTasks.filter(
    (task) => task.status !== "done" && !urgentTasks.some((urgent) => urgent.id === task.id),
  );
  const doneTasks = moveDayTasks.filter((task) => task.status === "done");
  const completedCount = doneTasks.length;
  const completion =
    moveDayTasks.length > 0
      ? Math.round((completedCount / moveDayTasks.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}`}>
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="space-y-2">
          <Badge variant="secondary">{workspace.name}</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Move Day</h1>
          <p className="text-muted-foreground">
            A focused checklist for the day everything needs to happen quickly.
          </p>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Move-day progress</p>
              <p className="text-sm text-muted-foreground">
                {completedCount} complete, {moveDayTasks.length - completedCount} open
              </p>
            </div>
            <span className="text-2xl font-semibold">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${completion}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <form
            action={createTask.bind(null, workspaceId)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input name="roomId" type="hidden" value={moveDayRoom?.id ?? ""} />
            <input name="status" type="hidden" value="todo" />
            <input name="priority" type="hidden" value="critical" />
            <input name="category" type="hidden" value="move_day" />
            <input name="estimatedEffort" type="hidden" value="quick" />
            <label className="sr-only" htmlFor="move-day-task-title">
              Add move-day task
            </label>
            <Input
              className="min-h-14 flex-1 text-base"
              id="move-day-task-title"
              maxLength={180}
              name="title"
              placeholder="Add a move-day task..."
              required
            />
            <Button className="min-h-14 text-base">
              <Plus aria-hidden="true" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {urgentTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Urgent now</h2>
            <Badge variant="destructive">{urgentTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {urgentTasks.map((task) => (
              <MoveDayTaskCard key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Open checklist</h2>
          <Badge variant="secondary">{openTasks.length}</Badge>
        </div>
        {openTasks.length > 0 ? (
          <div className="space-y-3">
            {openTasks.map((task) => (
              <MoveDayTaskCard key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-9 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <ClipboardCheck className="size-6" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-base">No open move-day tasks</CardTitle>
                <CardDescription>
                  Add a task above or enjoy the clear checklist.
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {doneTasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Done</h2>
            <Badge variant="secondary">{doneTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {doneTasks.map((task) => (
              <MoveDayTaskCard key={task.id} task={task} workspaceId={workspaceId} />
            ))}
          </div>
        </section>
      ) : null}

      <Button asChild variant="outline" className="min-h-12 w-full">
        <Link href={`/app/workspaces/${workspaceId}/tasks?category=move_day&showCompleted=true`}>
          Open detailed move-day task filters
        </Link>
      </Button>
    </div>
  );
}
