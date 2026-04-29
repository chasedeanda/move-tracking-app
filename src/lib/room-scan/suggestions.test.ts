import { describe, expect, it } from "vitest";

import { roomScanResponseSchema } from "@/lib/room-scan/schema";
import {
  filterDuplicateSuggestions,
  normalizeRoomScanResponse,
} from "@/lib/room-scan/suggestions";

const suggestion = {
  title: "Pack bookshelf",
  description: "Box books from the main shelf.",
  category: "packing" as const,
  priority: "medium" as const,
  estimatedEffort: "medium" as const,
  reason: "A bookshelf is visible in the room.",
};

describe("room scan suggestions", () => {
  it("validates structured AI output enums and required fields", () => {
    expect(
      roomScanResponseSchema.safeParse({
        roomSummary: "A living room with bookshelves and fragile decor.",
        suggestions: [suggestion],
      }).success,
    ).toBe(true);

    expect(
      roomScanResponseSchema.safeParse({
        roomSummary: "A room.",
        suggestions: [{ ...suggestion, category: "wrong" }],
      }).success,
    ).toBe(false);
  });

  it("filters suggestions that duplicate existing task titles or each other", () => {
    const filtered = filterDuplicateSuggestions(
      [
        suggestion,
        { ...suggestion, title: " Pack Bookshelf " },
        { ...suggestion, title: "Wrap fragile decor" },
      ],
      ["pack bookshelf"],
    );

    expect(filtered.map((item) => item.title)).toEqual(["Wrap fragile decor"]);
  });

  it("normalizes responses after duplicate filtering", () => {
    expect(
      normalizeRoomScanResponse(
        {
          roomSummary: "Room with shelves.",
          suggestions: [suggestion],
        },
        ["Pack bookshelf"],
      ),
    ).toEqual({
      roomSummary: "Room with shelves.",
      suggestions: [],
    });
  });
});
