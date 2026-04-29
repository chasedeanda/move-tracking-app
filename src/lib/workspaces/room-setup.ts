import { z } from "zod";

import type { TaskCategory, TaskEffort, TaskPriority } from "@/lib/db/types";

export const scannableStarterRooms = [
  "Entry / Front Area",
  "Living Room",
  "Kitchen",
  "Dining Area",
  "Primary Bedroom",
  "Kids Room",
  "Bathroom",
  "Garage / Storage",
  "Yard / Outdoor",
] as const;

export const requiredSpecialRooms = [
  "Utilities / Admin",
  "Move Day",
  "Post-Move",
] as const;

export const defaultSetupRooms = [
  ...scannableStarterRooms,
  ...requiredSpecialRooms,
] as const;

export type BaselineTaskSeed = {
  roomName: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedEffort: TaskEffort;
  sortOrder: number;
};

export const baselineTaskSeeds: BaselineTaskSeed[] = [
  {
    roomName: "Entry / Front Area",
    title: "Set aside essentials box",
    category: "packing",
    priority: "critical",
    estimatedEffort: "quick",
    sortOrder: 10,
  },
  {
    roomName: "Living Room",
    title: "Pack non-essential decor",
    category: "packing",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 20,
  },
  {
    roomName: "Kitchen",
    title: "Pack pantry overflow",
    category: "packing",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 30,
  },
  {
    roomName: "Kitchen",
    title: "Clean kitchen appliances",
    category: "cleaning",
    priority: "high",
    estimatedEffort: "big",
    sortOrder: 40,
  },
  {
    roomName: "Primary Bedroom",
    title: "Pack seasonal clothes",
    category: "packing",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 50,
  },
  {
    roomName: "Kids Room",
    title: "Sort kids toys",
    category: "donation",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 60,
  },
  {
    roomName: "Bathroom",
    title: "Clean bathroom surfaces",
    category: "cleaning",
    priority: "high",
    estimatedEffort: "medium",
    sortOrder: 70,
  },
  {
    roomName: "Garage / Storage",
    title: "Throw away broken items",
    category: "donation",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 80,
  },
  {
    roomName: "Yard / Outdoor",
    title: "Gather outdoor tools and supplies",
    category: "packing",
    priority: "medium",
    estimatedEffort: "medium",
    sortOrder: 90,
  },
  {
    roomName: "Utilities / Admin",
    title: "Confirm utility transfer dates",
    category: "utilities",
    priority: "critical",
    estimatedEffort: "quick",
    sortOrder: 100,
  },
  {
    roomName: "Utilities / Admin",
    title: "Update mailing address",
    category: "admin",
    priority: "high",
    estimatedEffort: "quick",
    sortOrder: 110,
  },
  {
    roomName: "Move Day",
    title: "Final room walkthrough",
    category: "move_day",
    priority: "critical",
    estimatedEffort: "quick",
    sortOrder: 120,
  },
  {
    roomName: "Move Day",
    title: "Confirm keys and lockup",
    category: "move_day",
    priority: "critical",
    estimatedEffort: "quick",
    sortOrder: 130,
  },
  {
    roomName: "Post-Move",
    title: "Unpack essentials first",
    category: "post_move",
    priority: "critical",
    estimatedEffort: "medium",
    sortOrder: 140,
  },
  {
    roomName: "Post-Move",
    title: "Check utilities working at new home",
    category: "post_move",
    priority: "high",
    estimatedEffort: "quick",
    sortOrder: 150,
  },
];

export const roomSetupSchema = z.object({
  selectedRooms: z.array(z.string()).default([]),
  customRooms: z.array(z.string()).default([]),
});

function normalizeRoomName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function roomKey(name: string) {
  return normalizeRoomName(name).toLowerCase();
}

export function buildSetupRoomNames(input: {
  selectedRooms: string[];
  customRooms: string[];
}) {
  const allowedDefaultRooms = new Set(defaultSetupRooms);
  const rooms = new Map<string, string>();

  for (const roomName of input.selectedRooms) {
    const normalizedRoomName = normalizeRoomName(roomName);

    if (allowedDefaultRooms.has(normalizedRoomName as (typeof defaultSetupRooms)[number])) {
      rooms.set(roomKey(normalizedRoomName), normalizedRoomName);
    }
  }

  for (const roomName of requiredSpecialRooms) {
    rooms.set(roomKey(roomName), roomName);
  }

  for (const roomName of input.customRooms) {
    const normalizedRoomName = normalizeRoomName(roomName);
    const key = roomKey(normalizedRoomName);

    if (normalizedRoomName && !rooms.has(key)) {
      rooms.set(key, normalizedRoomName.slice(0, 80));
    }
  }

  return Array.from(rooms.values());
}

export function buildBaselineTasksForRooms(roomNames: string[]) {
  const selectedRoomKeys = new Set(roomNames.map(roomKey));

  return baselineTaskSeeds.filter((task) =>
    selectedRoomKeys.has(roomKey(task.roomName)),
  );
}

export function buildRoomRows(workspaceId: string, roomNames: string[]) {
  return roomNames.map((name, index) => ({
    workspace_id: workspaceId,
    name,
    sort_order: (index + 1) * 10,
  }));
}
