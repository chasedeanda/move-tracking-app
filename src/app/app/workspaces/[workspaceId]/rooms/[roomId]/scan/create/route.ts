import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import {
  createRoomScanTasksRequestSchema,
} from "@/lib/room-scan/schema";
import { filterDuplicateSuggestions } from "@/lib/room-scan/suggestions";
import { buildRoomScanTaskRows } from "@/lib/room-scan/tasks";
import { createClient } from "@/lib/supabase/server";

type CreateRouteContext = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, context: CreateRouteContext) {
  const { workspaceId, roomId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedBody = createRoomScanTasksRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      parsedBody.error.issues[0]?.message ?? "No room scan tasks were selected.",
    );
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return errorResponse("Sign in again to save these tasks.", 401);
  }

  const [roomResult, existingTasksResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", roomId)
      .single(),
    supabase
      .from("tasks")
      .select("title")
      .eq("workspace_id", workspaceId)
      .eq("room_id", roomId),
  ]);

  if (roomResult.error || !roomResult.data) {
    return errorResponse("Room not found.", 404);
  }

  if (existingTasksResult.error) {
    return errorResponse(existingTasksResult.error.message, 400);
  }

  const suggestions = filterDuplicateSuggestions(
    parsedBody.data.suggestions,
    (existingTasksResult.data ?? []).map((task) => task.title),
  );

  if (suggestions.length === 0) {
    return errorResponse("These suggestions already exist in this room.");
  }

  const rows = buildRoomScanTaskRows({
    suggestions,
      workspaceId,
      roomId,
    userId: userData.user.id,
  });
  const { error } = await supabase.from("tasks").insert(rows);

  if (error) {
    return errorResponse(error.message, 400);
  }

  await supabase.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userData.user.id,
    action: "created",
    metadata: {
      entity: "room_scan_tasks",
      roomId,
      count: rows.length,
    },
  });

  revalidatePath(`/app/workspaces/${workspaceId}`);
  revalidatePath(`/app/workspaces/${workspaceId}/rooms`);
  revalidatePath(`/app/workspaces/${workspaceId}/rooms/${roomId}`);
  revalidatePath(`/app/workspaces/${workspaceId}/tasks`);

  return NextResponse.json({ created: rows.length });
}
