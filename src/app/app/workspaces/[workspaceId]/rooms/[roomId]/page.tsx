import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, Plus } from "lucide-react";

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
import { getRoomProgress } from "@/lib/dashboard/kpis";
import { createClient } from "@/lib/supabase/server";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";
import { cn } from "@/lib/utils";

type RoomDetailPageProps = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
};

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dueBadge(task: Task) {
  if (!task.due_date) {
    return null;
  }

  const bucket = getDueBucket(task.due_date);
  const label = bucket === "today" ? "Today" : format(parseISO(task.due_date), "MMM d");

  return (
    <Badge variant={bucket === "overdue" || bucket === "today" ? "destructive" : "secondary"}>
      <CalendarClock aria-hidden="true" />
      {bucket === "overdue" ? `Overdue ${label}` : `Due ${label}`}
    </Badge>
  );
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { workspaceId, roomId } = await params;
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  const [roomResult, tasksResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", roomId)
      .single<Room>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("room_id", roomId)
      .returns<Task[]>(),
  ]);

  if (roomResult.error || !roomResult.data) {
    notFound();
  }

  const room = roomResult.data;
  const tasks = sortTasksForDefaultView(tasksResult.data ?? []);
  const progress = getRoomProgress([room], tasks)[0];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}/rooms`}>
            <ArrowLeft aria-hidden="true" />
            Rooms
          </Link>
        </Button>
        <div className="space-y-2">
          <Badge variant="secondary">{workspace.name}</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">{room.name}</h1>
          <p className="text-muted-foreground">
            {progress.completedTasks} complete, {progress.incompleteTasks} still open.
          </p>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Room progress</p>
              <p className="text-sm text-muted-foreground">
                {progress.overdueTasks > 0
                  ? `${progress.overdueTasks} overdue tasks`
                  : "No overdue tasks"}
              </p>
            </div>
            <span className="text-2xl font-semibold">
              {progress.completionPercentage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                progress.overdueTasks > 0 ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${progress.completionPercentage}%` }}
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
            <input name="roomId" type="hidden" value={room.id} />
            <input name="status" type="hidden" value="todo" />
            <input name="priority" type="hidden" value="medium" />
            <input name="category" type="hidden" value="packing" />
            <input name="estimatedEffort" type="hidden" value="medium" />
            <label className="sr-only" htmlFor="room-task-title">
              Add room task
            </label>
            <Input
              className="min-h-12 flex-1"
              id="room-task-title"
              maxLength={180}
              name="title"
              placeholder={`Add a ${room.name} task...`}
              required
            />
            <Button className="min-h-12">
              <Plus aria-hidden="true" />
              Add task
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Room task list</h2>
        <Button asChild variant="outline">
          <Link href={`/app/workspaces/${workspaceId}/tasks?room=${room.id}`}>
            Open with filters
          </Link>
        </Button>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              className={cn(task.status === "done" && "bg-muted/45 opacity-80")}
              key={task.id}
            >
              <CardContent className="flex gap-3 p-4">
                <form
                  action={toggleTaskComplete.bind(
                    null,
                    workspaceId,
                    task.id,
                    task.status === "done" ? "todo" : "done",
                  )}
                >
                  <Button
                    aria-label={
                      task.status === "done" ? "Mark task incomplete" : "Complete task"
                    }
                    className="size-12 rounded-full"
                    size="icon"
                    variant={task.status === "done" ? "secondary" : "outline"}
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 className="size-5" aria-hidden />
                    ) : (
                      <Circle className="size-5" aria-hidden />
                    )}
                  </Button>
                </form>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h3
                      className={cn(
                        "break-words font-semibold",
                        task.status === "done" && "line-through",
                      )}
                    >
                      {task.title}
                    </h3>
                    {task.description ? (
                      <p className="break-words text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={task.status === "blocked" ? "destructive" : "outline"}>
                      {labelFromValue(task.status)}
                    </Badge>
                    <Badge variant={task.priority === "critical" ? "destructive" : "secondary"}>
                      {labelFromValue(task.priority)}
                    </Badge>
                    {dueBadge(task)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <CardTitle className="text-base">No tasks in this room yet</CardTitle>
            <CardDescription>
              Add one above or open the full task list to assign existing tasks here.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
