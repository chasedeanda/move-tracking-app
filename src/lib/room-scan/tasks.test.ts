import { describe, expect, it } from "vitest";

import { buildRoomScanTaskRows } from "@/lib/room-scan/tasks";

describe("room scan task rows", () => {
  it("maps selected scan suggestions to normal todo task rows", () => {
    expect(
      buildRoomScanTaskRows({
        workspaceId: "workspace",
        roomId: "room",
        userId: "user",
        suggestions: [
          {
            title: "Pack bookshelf",
            description: "Box books from the wall shelf.",
            category: "packing",
            priority: "medium",
            estimatedEffort: "medium",
            reason: "Bookshelves were visible in the scan.",
          },
        ],
      }),
    ).toEqual([
      {
        workspace_id: "workspace",
        room_id: "room",
        title: "Pack bookshelf",
        description: "Box books from the wall shelf.",
        status: "todo",
        priority: "medium",
        category: "packing",
        notes: "Bookshelves were visible in the scan.",
        estimated_effort: "medium",
        sort_order: 10,
        created_by: "user",
        updated_by: "user",
      },
    ]);
  });
});
