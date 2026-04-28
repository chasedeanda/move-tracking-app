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
import {
  getChecklistGroups,
  inferRoomChecklistCategory,
} from "@/lib/tasks/checklist";

type RoomDetailPageProps = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
};

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
  const {
    completedCount,
    doneTasks,
    openTasks,
    totalCount,
    urgentTasks,
  } = getChecklistGroups(tasksResult.data ?? []);
  const quickAddCategory = inferRoomChecklistCategory(room.name);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
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
            A focused room checklist for packing, cleaning, and wrap-up tasks.
          </p>
        </div>
      </section>

      <ChecklistProgressCard
        completedCount={completedCount}
        label="Room progress"
        totalCount={totalCount}
        urgentCount={urgentTasks.length}
      />

      <ChecklistQuickAdd
        category={quickAddCategory}
        estimatedEffort="medium"
        inputId="room-task-title"
        placeholder={`Add a ${room.name} task...`}
        priority="medium"
        roomId={room.id}
        workspaceId={workspaceId}
      />

      {urgentTasks.length > 0 ? (
        <ChecklistSection
          tasks={urgentTasks}
          title="Urgent now"
          variant="destructive"
          workspaceId={workspaceId}
        />
      ) : null}

      <ChecklistSection
        emptyDescription="Add one above or open the detailed task filters to assign existing tasks here."
        emptyIcon={ClipboardCheck}
        emptyTitle={`No open ${room.name} tasks`}
        tasks={openTasks}
        title="Open checklist"
        workspaceId={workspaceId}
      />

      {doneTasks.length > 0 ? (
        <ChecklistSection
          tasks={doneTasks}
          title="Done"
          workspaceId={workspaceId}
        />
      ) : null}

      <ChecklistDetailLink
        href={`/app/workspaces/${workspaceId}/tasks?room=${room.id}&showCompleted=true`}
        label="Open detailed room task filters"
      />
    </div>
  );
}
