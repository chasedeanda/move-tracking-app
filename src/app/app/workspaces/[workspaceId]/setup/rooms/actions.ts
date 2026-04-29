"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildBaselineTasksForRooms,
  buildRoomRows,
  buildSetupRoomNames,
  roomSetupSchema,
} from "@/lib/workspaces/room-setup";
import { createClient } from "@/lib/supabase/server";

function setupPath(workspaceId: string) {
  return `/app/workspaces/${workspaceId}/setup/rooms`;
}

function dashboardPath(workspaceId: string) {
  return `/app/workspaces/${workspaceId}`;
}

function formValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

function redirectWithError(workspaceId: string, message: string): never {
  redirect(`${setupPath(workspaceId)}?error=${encodeURIComponent(message)}`);
}

export async function completeRoomSetup(workspaceId: string, formData: FormData) {
  const parsed = roomSetupSchema.safeParse({
    selectedRooms: formValues(formData, "selectedRooms"),
    customRooms: formValues(formData, "customRooms"),
  });

  if (!parsed.success) {
    redirectWithError(
      workspaceId,
      parsed.error.issues[0]?.message ?? "Room setup could not be saved.",
    );
  }

  const roomNames = buildSetupRoomNames(parsed.data);
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/login");
  }

  const { data: existingRooms, error: existingRoomsError } = await supabase
    .from("rooms")
    .select("id,name")
    .eq("workspace_id", workspaceId);

  if (existingRoomsError) {
    redirectWithError(workspaceId, existingRoomsError.message);
  }

  const existingRoomNames = new Set(
    (existingRooms ?? []).map((room) => room.name.trim().toLowerCase()),
  );
  const roomsToInsert = buildRoomRows(workspaceId, roomNames).filter(
    (room) => !existingRoomNames.has(room.name.trim().toLowerCase()),
  );

  if (roomsToInsert.length > 0) {
    const { error: roomInsertError } = await supabase
      .from("rooms")
      .insert(roomsToInsert);

    if (roomInsertError) {
      redirectWithError(workspaceId, roomInsertError.message);
    }
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id,name")
    .eq("workspace_id", workspaceId)
    .in("name", roomNames);

  if (roomsError) {
    redirectWithError(workspaceId, roomsError.message);
  }

  const roomIdByName = new Map((rooms ?? []).map((room) => [room.name, room.id]));
  const baselineTasks = buildBaselineTasksForRooms(roomNames);
  const { data: existingTasks, error: existingTasksError } = await supabase
    .from("tasks")
    .select("title")
    .eq("workspace_id", workspaceId);

  if (existingTasksError) {
    redirectWithError(workspaceId, existingTasksError.message);
  }

  const existingTaskTitles = new Set(
    (existingTasks ?? []).map((task) => task.title.trim().toLowerCase()),
  );
  const tasksToInsert = baselineTasks
    .filter((task) => !existingTaskTitles.has(task.title.trim().toLowerCase()))
    .map((task) => ({
      workspace_id: workspaceId,
      room_id: roomIdByName.get(task.roomName) ?? null,
      title: task.title,
      status: "todo" as const,
      priority: task.priority,
      category: task.category,
      estimated_effort: task.estimatedEffort,
      sort_order: task.sortOrder,
      created_by: userData.user.id,
      updated_by: userData.user.id,
    }));

  if (tasksToInsert.length > 0) {
    const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert);

    if (tasksError) {
      redirectWithError(workspaceId, tasksError.message);
    }
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userData.user.id,
    action: "seeded",
    metadata: {
      entity: "guided_room_setup",
      rooms: roomNames.length,
      tasks: tasksToInsert.length,
    },
  });

  revalidatePath(dashboardPath(workspaceId));
  revalidatePath(`${dashboardPath(workspaceId)}/rooms`);
  redirect(dashboardPath(workspaceId));
}
