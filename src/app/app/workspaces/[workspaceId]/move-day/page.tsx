import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

import {
  ChecklistDetailLink,
  ChecklistProgressCard,
  ChecklistQuickAdd,
  ChecklistSection,
} from "@/components/tasks/checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Room, Task, Workspace } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { getChecklistGroups } from "@/lib/tasks/checklist";

type MoveDayPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

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
  const moveDayTasks = (tasksResult.data ?? []).filter(
    (task) =>
      task.category === "move_day" ||
      (moveDayRoom ? task.room_id === moveDayRoom.id : false),
  );
  const {
    completedCount,
    doneTasks,
    openTasks,
    totalCount,
    urgentTasks,
  } = getChecklistGroups(moveDayTasks);

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

      <ChecklistProgressCard
        completedCount={completedCount}
        label="Move-day progress"
        totalCount={totalCount}
        urgentCount={urgentTasks.length}
      />

      <ChecklistQuickAdd
        category="move_day"
        estimatedEffort="quick"
        inputId="move-day-task-title"
        placeholder="Add a move-day task..."
        priority="critical"
        roomId={moveDayRoom?.id ?? ""}
        workspaceId={workspaceId}
      />

      {urgentTasks.length > 0 ? (
        <ChecklistSection
          completeLabel="Complete move-day task"
          incompleteLabel="Mark move-day task incomplete"
          tasks={urgentTasks}
          title="Urgent now"
          variant="destructive"
          workspaceId={workspaceId}
        />
      ) : null}

      <ChecklistSection
        completeLabel="Complete move-day task"
        emptyDescription="Add a task above or enjoy the clear checklist."
        emptyIcon={ClipboardCheck}
        emptyTitle="No open move-day tasks"
        incompleteLabel="Mark move-day task incomplete"
        tasks={openTasks}
        title="Open checklist"
        workspaceId={workspaceId}
      />

      {doneTasks.length > 0 ? (
        <ChecklistSection
          completeLabel="Complete move-day task"
          incompleteLabel="Mark move-day task incomplete"
          tasks={doneTasks}
          title="Done"
          workspaceId={workspaceId}
        />
      ) : null}

      <ChecklistDetailLink
        href={`/app/workspaces/${workspaceId}/tasks?category=move_day&showCompleted=true`}
        label="Open detailed move-day task filters"
      />
    </div>
  );
}
