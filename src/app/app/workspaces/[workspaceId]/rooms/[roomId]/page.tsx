import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ClipboardCheck } from "lucide-react";

import {
  ChecklistMember,
  ChecklistDetailLink,
  ChecklistProgressCard,
  ChecklistQuickAdd,
  ChecklistSection,
} from "@/components/tasks/checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile, Room, Task, Workspace, WorkspaceMember } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import {
  filterRoomChecklistTasks,
  getChecklistGroups,
  inferRoomChecklistCategory,
  type RoomChecklistScope,
} from "@/lib/tasks/checklist";

type RoomDetailPageProps = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
  searchParams: Promise<{
    scope?: string;
  }>;
};

function memberName(member: ChecklistMember) {
  return member.profile?.display_name || member.profile?.email || "Household member";
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: RoomDetailPageProps) {
  const { workspaceId, roomId } = await params;
  const { scope } = await searchParams;
  const checklistScope: RoomChecklistScope = scope === "all" ? "all" : "mine";
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

  const [roomResult, tasksResult, membersResult] = await Promise.all([
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
    supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true })
      .returns<WorkspaceMember[]>(),
  ]);

  if (roomResult.error || !roomResult.data) {
    notFound();
  }

  const room = roomResult.data;
  const roomTasks = tasksResult.data ?? [];
  const visibleTasks = filterRoomChecklistTasks(
    roomTasks,
    userData.user.id,
    checklistScope,
  );
  const hiddenAssignedTaskCount = roomTasks.length - visibleTasks.length;
  const membersRaw = membersResult.data ?? [];
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
  const members: ChecklistMember[] = membersRaw.map((member) => ({
    user_id: member.user_id,
    profile: profilesById.get(member.user_id) ?? null,
  }));
  const currentMember = members.find((member) => member.user_id === userData.user.id);
  const {
    completedCount,
    doneTasks,
    openTasks,
    totalCount,
    urgentTasks,
  } = getChecklistGroups(visibleTasks);
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-normal">{room.name}</h1>
              <p className="text-muted-foreground">
                A focused room checklist for packing, cleaning, and wrap-up tasks.
              </p>
            </div>
            <Button asChild className="min-h-12">
              <Link href={`/app/workspaces/${workspaceId}/rooms/${room.id}/scan`}>
                <Camera className="size-4" aria-hidden />
                Scan room
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/35 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Showing{" "}
            {checklistScope === "all"
              ? "everyone's tasks"
              : `tasks for ${currentMember ? memberName(currentMember) : "you"} and unassigned`}
          </p>
          {hiddenAssignedTaskCount > 0 && checklistScope !== "all" ? (
            <p className="text-sm text-muted-foreground">
              {hiddenAssignedTaskCount} task{hiddenAssignedTaskCount === 1 ? "" : "s"} assigned to others hidden.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            asChild
            variant={checklistScope === "mine" ? "default" : "outline"}
          >
            <Link href={`/app/workspaces/${workspaceId}/rooms/${room.id}`}>
              Mine + unassigned
            </Link>
          </Button>
          <Button
            asChild
            variant={checklistScope === "all" ? "default" : "outline"}
          >
            <Link href={`/app/workspaces/${workspaceId}/rooms/${room.id}?scope=all`}>
              All tasks
            </Link>
          </Button>
        </div>
      </div>

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
          members={members}
          workspaceId={workspaceId}
        />
      ) : null}

      <ChecklistSection
        emptyDescription="Add one above or open the detailed task filters to assign existing tasks here."
        emptyIcon={ClipboardCheck}
        emptyTitle={`No open ${room.name} tasks`}
        members={members}
        tasks={openTasks}
        title="Open checklist"
        workspaceId={workspaceId}
      />

      {doneTasks.length > 0 ? (
        <ChecklistSection
          members={members}
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
