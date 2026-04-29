import { describe, expect, it } from "vitest";

import {
  buildBaselineTasksForRooms,
  buildRoomRows,
  buildSetupRoomNames,
  requiredSpecialRooms,
} from "@/lib/workspaces/room-setup";

describe("guided room setup helpers", () => {
  it("keeps selected rooms, dedupes custom rooms, and always includes special rooms", () => {
    const rooms = buildSetupRoomNames({
      selectedRooms: ["Kitchen", "Living Room", "Not a default"],
      customRooms: [" Office ", "office", "Guest Bedroom"],
    });

    expect(rooms).toEqual([
      "Kitchen",
      "Living Room",
      ...requiredSpecialRooms,
      "Office",
      "Guest Bedroom",
    ]);
  });

  it("builds baseline tasks only for rooms being created", () => {
    const tasks = buildBaselineTasksForRooms([
      "Kitchen",
      "Move Day",
      "Post-Move",
    ]);

    expect(tasks.map((task) => task.roomName)).toEqual([
      "Kitchen",
      "Kitchen",
      "Move Day",
      "Move Day",
      "Post-Move",
      "Post-Move",
    ]);
    expect(tasks.some((task) => task.roomName === "Living Room")).toBe(false);
  });

  it("assigns stable room sort order rows", () => {
    expect(buildRoomRows("workspace", ["Kitchen", "Move Day"])).toEqual([
      { workspace_id: "workspace", name: "Kitchen", sort_order: 10 },
      { workspace_id: "workspace", name: "Move Day", sort_order: 20 },
    ]);
  });
});
