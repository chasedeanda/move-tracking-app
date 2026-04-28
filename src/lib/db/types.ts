export const memberRoles = ["owner", "member"] as const;
export const taskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
export const taskPriorities = ["low", "medium", "high", "critical"] as const;
export const taskCategories = [
  "packing",
  "cleaning",
  "shopping",
  "admin",
  "utilities",
  "repairs",
  "donation",
  "move_day",
  "post_move",
] as const;
export const taskEfforts = ["quick", "medium", "big"] as const;
export const activityActions = [
  "created",
  "updated",
  "completed",
  "deleted",
  "assigned",
  "seeded",
] as const;

export type MemberRole = (typeof memberRoles)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskCategory = (typeof taskCategories)[number];
export type TaskEffort = (typeof taskEfforts)[number];
export type ActivityAction = (typeof activityActions)[number];

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  move_date: string;
  current_address: string;
  new_address: string;
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type Room = {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  room_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date: string | null;
  start_date: string | null;
  notes: string | null;
  estimated_effort: TaskEffort;
  sort_order: number;
  created_by: string;
  updated_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  workspace_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  workspace_id: string;
  actor_id: string;
  task_id: string | null;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
};
