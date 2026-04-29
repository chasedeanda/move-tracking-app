import type { RoomScanSuggestion } from "@/lib/room-scan/schema";

export function buildRoomScanTaskRows({
  roomId,
  suggestions,
  userId,
  workspaceId,
}: {
  roomId: string;
  suggestions: RoomScanSuggestion[];
  userId: string;
  workspaceId: string;
}) {
  return suggestions.map((suggestion, index) => ({
    workspace_id: workspaceId,
    room_id: roomId,
    title: suggestion.title,
    description: suggestion.description,
    status: "todo" as const,
    priority: suggestion.priority,
    category: suggestion.category,
    notes: suggestion.reason,
    estimated_effort: suggestion.estimatedEffort,
    sort_order: (index + 1) * 10,
    created_by: userId,
    updated_by: userId,
  }));
}
