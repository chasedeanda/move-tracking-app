import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Filter,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  assignTask,
  createQuickTask,
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  toggleSubtask,
  toggleTaskComplete,
  updateSubtask,
  updateTask,
} from "@/app/app/workspaces/[workspaceId]/tasks/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type Profile,
  type Room,
  type Subtask,
  type Task,
  taskCategories,
  taskEfforts,
  type TaskPriority,
  taskPriorities,
  type TaskStatus,
  taskStatuses,
  type Workspace,
  type WorkspaceMember,
} from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { getDueBucket, sortTasksForDefaultView } from "@/lib/tasks/sorting";
import { cn } from "@/lib/utils";

type TasksPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    status?: string;
    assignee?: string;
    room?: string;
    category?: string;
    due?: string;
    showCompleted?: string;
    error?: string;
  }>;
};

type MemberView = WorkspaceMember & {
  profile: Profile | null;
};

const dueFilters = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "next7", label: "Next 7 days" },
  { value: "later", label: "Later" },
  { value: "none", label: "No due date" },
] as const;

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function memberName(member: MemberView | undefined) {
  if (!member) {
    return "Unassigned";
  }

  return member.profile?.display_name || member.profile?.email || "Household member";
}

function getDueLabel(task: Task) {
  if (!task.due_date) {
    return null;
  }

  const bucket = getDueBucket(task.due_date);
  const label = format(parseISO(task.due_date), "MMM d");

  if (bucket === "overdue") {
    return { text: `Overdue ${label}`, urgent: true };
  }

  if (bucket === "today") {
    return { text: "Due today", urgent: true };
  }

  if (bucket === "next7") {
    return { text: `Due ${label}`, urgent: false };
  }

  return { text: `Due ${label}`, urgent: false };
}

function filterTasks(
  tasks: Task[],
  filters: Awaited<TasksPageProps["searchParams"]>,
) {
  const showCompleted = filters.showCompleted === "true";
  const status = filters.status ?? "all";
  const assignee = filters.assignee ?? "all";
  const room = filters.room ?? "all";
  const category = filters.category ?? "all";
  const due = filters.due ?? "all";

  return tasks.filter((task) => {
    if (!showCompleted && task.status === "done") {
      return false;
    }

    if (status !== "all" && task.status !== status) {
      return false;
    }

    if (assignee === "unassigned" && task.assignee_id !== null) {
      return false;
    }

    if (assignee !== "all" && assignee !== "unassigned" && task.assignee_id !== assignee) {
      return false;
    }

    if (room === "none" && task.room_id !== null) {
      return false;
    }

    if (room !== "all" && room !== "none" && task.room_id !== room) {
      return false;
    }

    if (category !== "all" && task.category !== category) {
      return false;
    }

    if (due !== "all" && getDueBucket(task.due_date) !== due) {
      return false;
    }

    return true;
  });
}

function NativeSelect({
  children,
  defaultValue,
  id,
  name,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  id: string;
  name: string;
}) {
  return (
    <select
      className="flex h-11 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      defaultValue={defaultValue}
      id={id}
      name={name}
    >
      {children}
    </select>
  );
}

function TaskFields({
  members,
  rooms,
  task,
}: {
  members: MemberView[];
  rooms: Room[];
  task?: Task;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={task ? `title-${task.id}` : "title-new"}>
          Title
        </label>
        <Input
          id={task ? `title-${task.id}` : "title-new"}
          maxLength={180}
          name="title"
          required
          defaultValue={task?.title}
          placeholder="Pack hallway closet"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `status-${task.id}` : "status-new"}>
            Status
          </label>
          <NativeSelect
            defaultValue={task?.status ?? "todo"}
            id={task ? `status-${task.id}` : "status-new"}
            name="status"
          >
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {labelFromValue(status)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `priority-${task.id}` : "priority-new"}>
            Priority
          </label>
          <NativeSelect
            defaultValue={task?.priority ?? "medium"}
            id={task ? `priority-${task.id}` : "priority-new"}
            name="priority"
          >
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {labelFromValue(priority)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `category-${task.id}` : "category-new"}>
            Category
          </label>
          <NativeSelect
            defaultValue={task?.category ?? "packing"}
            id={task ? `category-${task.id}` : "category-new"}
            name="category"
          >
            {taskCategories.map((category) => (
              <option key={category} value={category}>
                {labelFromValue(category)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `effort-${task.id}` : "effort-new"}>
            Effort
          </label>
          <NativeSelect
            defaultValue={task?.estimated_effort ?? "medium"}
            id={task ? `effort-${task.id}` : "effort-new"}
            name="estimatedEffort"
          >
            {taskEfforts.map((effort) => (
              <option key={effort} value={effort}>
                {labelFromValue(effort)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `room-${task.id}` : "room-new"}>
            Room
          </label>
          <NativeSelect
            defaultValue={task?.room_id ?? ""}
            id={task ? `room-${task.id}` : "room-new"}
            name="roomId"
          >
            <option value="">No room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `assignee-${task.id}` : "assignee-new"}>
            Assignee
          </label>
          <NativeSelect
            defaultValue={task?.assignee_id ?? ""}
            id={task ? `assignee-${task.id}` : "assignee-new"}
            name="assigneeId"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {memberName(member)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `start-${task.id}` : "start-new"}>
            Start date
          </label>
          <Input
            id={task ? `start-${task.id}` : "start-new"}
            name="startDate"
            type="date"
            defaultValue={task?.start_date ?? ""}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={task ? `due-${task.id}` : "due-new"}>
            Due date
          </label>
          <Input
            id={task ? `due-${task.id}` : "due-new"}
            name="dueDate"
            type="date"
            defaultValue={task?.due_date ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={task ? `description-${task.id}` : "description-new"}>
          Description
        </label>
        <Textarea
          id={task ? `description-${task.id}` : "description-new"}
          name="description"
          rows={3}
          defaultValue={task?.description ?? ""}
          placeholder="Add any context the household needs."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={task ? `notes-${task.id}` : "notes-new"}>
          Notes
        </label>
        <Textarea
          id={task ? `notes-${task.id}` : "notes-new"}
          name="notes"
          rows={3}
          defaultValue={task?.notes ?? ""}
          placeholder="Optional notes"
        />
      </div>
    </div>
  );
}

function priorityTone(priority: TaskPriority) {
  if (priority === "critical") {
    return "destructive" as const;
  }

  if (priority === "high") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusTone(status: TaskStatus) {
  if (status === "done") {
    return "secondary" as const;
  }

  if (status === "blocked") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { workspaceId } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  const [roomsResult, tasksResult, membersResult, subtasksResult] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true })
        .returns<Room[]>(),
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .returns<Task[]>(),
      supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true })
        .returns<WorkspaceMember[]>(),
      supabase
        .from("subtasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true })
        .returns<Subtask[]>(),
    ]);

  const rooms = roomsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const membersRaw = membersResult.data ?? [];
  const subtasks = subtasksResult.data ?? [];
  const profileIds = membersRaw.map((member) => member.user_id);
  const profilesResult =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds)
          .returns<Profile[]>()
      : { data: [] as Profile[] };
  const profilesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );
  const members: MemberView[] = membersRaw.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? null,
  }));
  const membersById = new Map(members.map((member) => [member.user_id, member]));
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const subtasksByTaskId = new Map<string, Subtask[]>();

  for (const subtask of subtasks) {
    const list = subtasksByTaskId.get(subtask.task_id) ?? [];
    list.push(subtask);
    subtasksByTaskId.set(subtask.task_id, list);
  }

  const visibleTasks = sortTasksForDefaultView(filterTasks(tasks, filters));
  const activeFilterCount = [
    filters.status && filters.status !== "all",
    filters.assignee && filters.assignee !== "all",
    filters.room && filters.room !== "all",
    filters.category && filters.category !== "all",
    filters.due && filters.due !== "all",
    filters.showCompleted === "true",
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}`}>
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">{workspace.name}</Badge>
            <h1 className="text-3xl font-semibold tracking-normal">Tasks</h1>
            <p className="text-muted-foreground">
              A shared list for packing, cleaning, utilities, move day, and
              post-move setup.
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="min-h-12">
                <Plus aria-hidden="true" />
                Add detailed task
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[92dvh] overflow-y-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[34rem] md:rounded-none md:border-l"
            >
              <SheetHeader>
                <SheetTitle>Add task</SheetTitle>
                <SheetDescription>
                  Add the title now, or include ownership and timing details.
                </SheetDescription>
              </SheetHeader>
              <form action={createTask.bind(null, workspaceId)} className="mt-5">
                <TaskFields members={members} rooms={rooms} />
                <SheetFooter>
                  <Button className="min-h-12">
                    <Plus aria-hidden="true" />
                    Create task
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      {filters.error ? (
        <Alert variant="destructive">
          <AlertTitle>Task change failed</AlertTitle>
          <AlertDescription>{filters.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <form
            action={createQuickTask.bind(null, workspaceId)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="quick-title">
              New task title
            </label>
            <Input
              id="quick-title"
              name="title"
              placeholder="Quick add a task..."
              required
              className="min-h-12 flex-1"
            />
            <Button className="min-h-12 sm:w-auto">
              <Plus aria-hidden="true" />
              Add task
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 ? (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>Filters stay in the URL for sharing or refreshes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <NativeSelect defaultValue={filters.status ?? "all"} id="filter-status" name="status">
              <option value="all">Any status</option>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {labelFromValue(status)}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              defaultValue={filters.assignee ?? "all"}
              id="filter-assignee"
              name="assignee"
            >
              <option value="all">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {memberName(member)}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect defaultValue={filters.room ?? "all"} id="filter-room" name="room">
              <option value="all">Any room</option>
              <option value="none">No room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              defaultValue={filters.category ?? "all"}
              id="filter-category"
              name="category"
            >
              <option value="all">Any category</option>
              {taskCategories.map((category) => (
                <option key={category} value={category}>
                  {labelFromValue(category)}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect defaultValue={filters.due ?? "all"} id="filter-due" name="due">
              {dueFilters.map((due) => (
                <option key={due.value} value={due.value}>
                  {due.label}
                </option>
              ))}
            </NativeSelect>

            <div className="flex gap-2">
              <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border bg-card px-3 text-sm">
                <input
                  className="size-4 accent-primary"
                  defaultChecked={filters.showCompleted === "true"}
                  name="showCompleted"
                  type="checkbox"
                  value="true"
                />
                Done
              </label>
              <Button className="min-h-11" type="submit">
                Apply
              </Button>
            </div>
          </form>
          {activeFilterCount > 0 ? (
            <Button asChild variant="link" className="mt-2 px-0">
              <Link href={`/app/workspaces/${workspaceId}/tasks`}>Clear filters</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {visibleTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ClipboardList className="size-6" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold">No tasks match this view</h2>
              <p className="text-sm text-muted-foreground">
                Add a quick task or clear filters to get back to the full list.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const due = getDueLabel(task);
            const taskSubtasks = subtasksByTaskId.get(task.id) ?? [];
            const completedSubtasks = taskSubtasks.filter((subtask) => subtask.is_done).length;

            return (
              <Card
                className={cn(
                  "overflow-hidden",
                  task.status === "done" && "bg-muted/45 opacity-80",
                  due?.urgent && task.status !== "done" && "border-destructive/45",
                )}
                key={task.id}
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex gap-3">
                    <form
                      action={toggleTaskComplete.bind(
                        null,
                        workspaceId,
                        task.id,
                        task.status === "done" ? "todo" : "done",
                      )}
                    >
                      <Button
                        aria-label={task.status === "done" ? "Mark task incomplete" : "Complete task"}
                        className="size-12 rounded-full"
                        size="icon"
                        variant={task.status === "done" ? "secondary" : "outline"}
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="size-5" aria-hidden />
                        ) : (
                          <Circle className="size-5" aria-hidden />
                        )}
                      </Button>
                    </form>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="space-y-1">
                        <h2
                          className={cn(
                            "break-words text-base font-semibold leading-snug",
                            task.status === "done" && "line-through",
                          )}
                        >
                          {task.title}
                        </h2>
                        {task.description ? (
                          <p className="break-words text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant={statusTone(task.status)}>{labelFromValue(task.status)}</Badge>
                        <Badge variant={priorityTone(task.priority)}>
                          {labelFromValue(task.priority)}
                        </Badge>
                        <Badge variant="outline">{labelFromValue(task.category)}</Badge>
                        {roomsById.get(task.room_id ?? "") ? (
                          <Badge variant="secondary">
                            {roomsById.get(task.room_id ?? "")?.name}
                          </Badge>
                        ) : null}
                        {due ? (
                          <Badge variant={due.urgent ? "destructive" : "secondary"}>
                            <CalendarClock aria-hidden="true" />
                            {due.text}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="size-4" aria-hidden />
                          {memberName(membersById.get(task.assignee_id ?? ""))}
                        </span>
                        <span>{labelFromValue(task.estimated_effort)} effort</span>
                        {taskSubtasks.length > 0 ? (
                          <span>
                            {completedSubtasks}/{taskSubtasks.length} subtasks
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="space-y-2">
                      {taskSubtasks.map((subtask) => (
                        <div
                          className="flex items-center gap-2 rounded-lg bg-background p-2"
                          key={subtask.id}
                        >
                          <form
                            action={toggleSubtask.bind(
                              null,
                              workspaceId,
                              subtask.id,
                              !subtask.is_done,
                            )}
                          >
                            <Button
                              aria-label={
                                subtask.is_done
                                  ? "Mark subtask incomplete"
                                  : "Complete subtask"
                              }
                              size="icon"
                              variant="ghost"
                              className="size-9"
                            >
                              {subtask.is_done ? (
                                <Check className="size-4" aria-hidden />
                              ) : (
                                <Circle className="size-4" aria-hidden />
                              )}
                            </Button>
                          </form>
                          <span
                            className={cn(
                              "min-w-0 flex-1 break-words text-sm",
                              subtask.is_done && "line-through text-muted-foreground",
                            )}
                          >
                            {subtask.title}
                          </span>
                          <form action={deleteSubtask.bind(null, workspaceId, subtask.id)}>
                            <Button
                              aria-label="Delete subtask"
                              size="icon"
                              variant="ghost"
                              className="size-9 text-muted-foreground"
                            >
                              <X className="size-4" aria-hidden />
                            </Button>
                          </form>
                        </div>
                      ))}

                      <form
                        action={createSubtask.bind(null, workspaceId, task.id)}
                        className="flex gap-2"
                      >
                        <label className="sr-only" htmlFor={`subtask-${task.id}`}>
                          New subtask
                        </label>
                        <Input
                          id={`subtask-${task.id}`}
                          name="title"
                          placeholder="Add subtask"
                          className="min-h-10"
                        />
                        <Button size="sm" variant="secondary">
                          Add
                        </Button>
                      </form>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <form
                      action={assignTask.bind(null, workspaceId, task.id)}
                      className="flex gap-2 sm:min-w-80"
                    >
                      <label className="sr-only" htmlFor={`assign-${task.id}`}>
                        Assign task
                      </label>
                      <NativeSelect
                        defaultValue={task.assignee_id ?? ""}
                        id={`assign-${task.id}`}
                        name="assigneeId"
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {memberName(member)}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button variant="outline">Assign</Button>
                    </form>

                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline">
                            <Pencil aria-hidden="true" />
                            Edit
                          </Button>
                        </SheetTrigger>
                        <SheetContent
                          side="bottom"
                          className="max-h-[92dvh] overflow-y-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[34rem] md:rounded-none md:border-l"
                        >
                          <SheetHeader>
                            <SheetTitle>Edit task</SheetTitle>
                            <SheetDescription>
                              Update task details, ownership, dates, and subtasks.
                            </SheetDescription>
                          </SheetHeader>
                          <form
                            action={updateTask.bind(null, workspaceId, task.id)}
                            className="mt-5"
                          >
                            <TaskFields members={members} rooms={rooms} task={task} />
                            <SheetFooter>
                              <Button className="min-h-12">
                                <Save aria-hidden="true" />
                                Save task
                              </Button>
                            </SheetFooter>
                          </form>

                          {taskSubtasks.length > 0 ? (
                            <div className="mt-6 space-y-3">
                              <h3 className="text-sm font-semibold">Subtasks</h3>
                              {taskSubtasks.map((subtask) => (
                                <form
                                  action={updateSubtask.bind(null, workspaceId, subtask.id)}
                                  className="flex gap-2"
                                  key={subtask.id}
                                >
                                  <label
                                    className="sr-only"
                                    htmlFor={`edit-subtask-${subtask.id}`}
                                  >
                                    Edit subtask
                                  </label>
                                  <Input
                                    id={`edit-subtask-${subtask.id}`}
                                    name="title"
                                    defaultValue={subtask.title}
                                    className="min-h-10"
                                  />
                                  <Button size="sm" variant="outline">
                                    Save
                                  </Button>
                                </form>
                              ))}
                            </div>
                          ) : null}
                        </SheetContent>
                      </Sheet>

                      <form action={deleteTask.bind(null, workspaceId, task.id)}>
                        <Button className="w-full" variant="destructive">
                          <Trash2 aria-hidden="true" />
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
