import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, CheckCircle2, Circle, Plus } from "lucide-react";

import {
  createTask,
  toggleTaskComplete,
} from "@/app/app/workspaces/[workspaceId]/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Task, TaskCategory, TaskEffort, TaskPriority } from "@/lib/db/types";
import { getDueBucket } from "@/lib/tasks/sorting";
import { cn } from "@/lib/utils";

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dueLabel(task: Task) {
  if (!task.due_date) {
    return null;
  }

  const bucket = getDueBucket(task.due_date);
  const dateLabel = format(parseISO(task.due_date), "MMM d");

  if (bucket === "overdue") {
    return { text: `Overdue ${dateLabel}`, urgent: true };
  }

  if (bucket === "today") {
    return { text: "Due today", urgent: true };
  }

  return { text: `Due ${dateLabel}`, urgent: false };
}

export function ChecklistProgressCard({
  completedCount,
  label,
  totalCount,
  urgentCount = 0,
}: {
  completedCount: number;
  label: string;
  totalCount: number;
  urgentCount?: number;
}) {
  const openCount = totalCount - completedCount;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">
              {completedCount} complete, {openCount} open
            </p>
          </div>
          <span className="text-2xl font-semibold">{completionPercentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              urgentCount > 0 ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ChecklistQuickAdd({
  category,
  estimatedEffort,
  inputId,
  placeholder,
  priority,
  roomId,
  workspaceId,
}: {
  category: TaskCategory;
  estimatedEffort: TaskEffort;
  inputId: string;
  placeholder: string;
  priority: TaskPriority;
  roomId: string;
  workspaceId: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <form
          action={createTask.bind(null, workspaceId)}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input name="roomId" type="hidden" value={roomId} />
          <input name="status" type="hidden" value="todo" />
          <input name="priority" type="hidden" value={priority} />
          <input name="category" type="hidden" value={category} />
          <input name="estimatedEffort" type="hidden" value={estimatedEffort} />
          <label className="sr-only" htmlFor={inputId}>
            {placeholder}
          </label>
          <Input
            className="min-h-14 flex-1 text-base"
            id={inputId}
            maxLength={180}
            name="title"
            placeholder={placeholder}
            required
          />
          <Button className="min-h-14 text-base">
            <Plus aria-hidden="true" />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ChecklistTaskCard({
  completeLabel = "Complete task",
  incompleteLabel = "Mark task incomplete",
  task,
  workspaceId,
}: {
  completeLabel?: string;
  incompleteLabel?: string;
  task: Task;
  workspaceId: string;
}) {
  const due = dueLabel(task);
  const isDone = task.status === "done";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isDone && "bg-muted/45 opacity-80",
        due?.urgent && !isDone && "border-destructive/50",
      )}
    >
      <CardContent className="flex gap-4 p-4">
        <form
          action={toggleTaskComplete.bind(
            null,
            workspaceId,
            task.id,
            isDone ? "todo" : "done",
          )}
        >
          <Button
            aria-label={isDone ? incompleteLabel : completeLabel}
            className="size-14 rounded-full"
            size="icon"
            variant={isDone ? "secondary" : "outline"}
          >
            {isDone ? (
              <CheckCircle2 className="size-6" aria-hidden />
            ) : (
              <Circle className="size-6" aria-hidden />
            )}
          </Button>
        </form>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2
              className={cn(
                "break-words text-lg font-semibold leading-snug",
                isDone && "line-through",
              )}
            >
              {task.title}
            </h2>
            {task.description ? (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {task.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={task.priority === "critical" ? "destructive" : "secondary"}>
              {labelFromValue(task.priority)}
            </Badge>
            {task.status === "blocked" ? (
              <Badge variant="destructive">Blocked</Badge>
            ) : null}
            {due ? (
              <Badge variant={due.urgent ? "destructive" : "outline"}>
                <CalendarClock aria-hidden="true" />
                {due.text}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChecklistSection({
  completeLabel,
  emptyDescription,
  emptyIcon: EmptyIcon,
  emptyTitle,
  incompleteLabel,
  tasks,
  title,
  variant = "secondary",
  workspaceId,
}: {
  completeLabel?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  incompleteLabel?: string;
  tasks: Task[];
  title: string;
  variant?: "secondary" | "destructive";
  workspaceId: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Badge variant={variant}>{tasks.length}</Badge>
      </div>
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <ChecklistTaskCard
              completeLabel={completeLabel}
              incompleteLabel={incompleteLabel}
              key={task.id}
              task={task}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      ) : emptyTitle ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-9 text-center">
            {EmptyIcon ? (
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <EmptyIcon className="size-6" aria-hidden />
              </div>
            ) : null}
            <div>
              <CardTitle className="text-base">{emptyTitle}</CardTitle>
              {emptyDescription ? (
                <CardDescription>{emptyDescription}</CardDescription>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

export function ChecklistDetailLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild variant="outline" className="min-h-12 w-full">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
