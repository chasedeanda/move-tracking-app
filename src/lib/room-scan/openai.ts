import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { Task, Workspace } from "@/lib/db/types";
import {
  type RoomScanResponse,
  roomScanResponseSchema,
} from "@/lib/room-scan/schema";
import { normalizeRoomScanResponse } from "@/lib/room-scan/suggestions";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openaiClient ??= new OpenAI({ apiKey });
  return openaiClient;
}

function existingTaskSummary(tasks: Task[]) {
  if (tasks.length === 0) {
    return "No existing tasks in this room yet.";
  }

  return tasks.map((task) => `- ${task.title} (${task.category})`).join("\n");
}

export async function generateRoomScanSuggestions({
  existingTasks,
  imageDataUrls,
  notes,
  roomName,
  workspace,
}: {
  existingTasks: Task[];
  imageDataUrls: string[];
  notes: string;
  roomName: string;
  workspace: Workspace;
}): Promise<RoomScanResponse> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_ROOM_SCAN_MODEL ?? "gpt-4.1";
  const content = [
    {
      type: "input_text" as const,
      text: [
        `Room: ${roomName}`,
        `Workspace: ${workspace.name}`,
        `Move date: ${workspace.move_date}`,
        `User notes: ${notes || "No extra notes provided."}`,
        "Existing room tasks:",
        existingTaskSummary(existingTasks),
        "",
        "Create practical moving checklist suggestions for this specific room.",
        "Focus on visible objects, packing, cleaning, repairs, decluttering, donation, shopping, and move-readiness.",
        "Do not duplicate existing tasks. Avoid vague tasks like 'organize room'.",
        "Use concise task titles and choose only supported enum values.",
      ].join("\n"),
    },
    ...imageDataUrls.map((imageUrl) => ({
      type: "input_image" as const,
      image_url: imageUrl,
      detail: "low" as const,
    })),
  ];

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a calm, practical moving coordinator. Generate room-specific tasks that a family or roommate household can review quickly.",
      },
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: zodTextFormat(roomScanResponseSchema, "room_scan_response"),
    },
  });

  const parsedResponse = response.output_parsed;

  if (!parsedResponse) {
    throw new Error("Room scan did not return structured suggestions.");
  }

  return normalizeRoomScanResponse(
    parsedResponse,
    existingTasks.map((task) => task.title),
  );
}
