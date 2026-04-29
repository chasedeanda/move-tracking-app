import { NextResponse, type NextRequest } from "next/server";

import type { Room, Task, Workspace } from "@/lib/db/types";
import {
  roomScanGenerateRequestSchema,
  roomScanResponseSchema,
} from "@/lib/room-scan/schema";
import { generateRoomScanSuggestions } from "@/lib/room-scan/openai";
import { createClient } from "@/lib/supabase/server";

type GenerateRouteContext = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, context: GenerateRouteContext) {
  const { workspaceId, roomId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedBody = roomScanGenerateRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      parsedBody.error.issues[0]?.message ?? "Room scan request is invalid.",
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return errorResponse(
      "Room Scan needs OPENAI_API_KEY configured before it can generate tasks.",
      503,
    );
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return errorResponse("Sign in again to scan this room.", 401);
  }

  const [workspaceResult, roomResult, tasksResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single<Workspace>(),
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

  if (workspaceResult.error || !workspaceResult.data) {
    return errorResponse("Workspace not found.", 404);
  }

  if (roomResult.error || !roomResult.data) {
    return errorResponse("Room not found.", 404);
  }

  if (tasksResult.error) {
    return errorResponse(tasksResult.error.message, 400);
  }

  try {
    const response = await generateRoomScanSuggestions({
      existingTasks: tasksResult.data ?? [],
      imageDataUrls: parsedBody.data.images,
      notes: parsedBody.data.notes,
      roomName: roomResult.data.name,
      workspace: workspaceResult.data,
    });

    return NextResponse.json(roomScanResponseSchema.parse(response));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Room Scan could not generate suggestions.";
    return errorResponse(message, 500);
  }
}
