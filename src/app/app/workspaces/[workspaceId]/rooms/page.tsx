import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, Home, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Room, Task, Workspace } from "@/lib/db/types";
import { getRoomProgress } from "@/lib/dashboard/kpis";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RoomsPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function RoomsPage({ params }: RoomsPageProps) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  const [roomsResult, tasksResult] = await Promise.all([
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
  ]);
  const rooms = roomsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const roomProgress = getRoomProgress(rooms, tasks);
  const totalIncomplete = roomProgress.reduce(
    (sum, room) => sum + room.incompleteTasks,
    0,
  );
  const totalOverdue = roomProgress.reduce((sum, room) => sum + room.overdueTasks, 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}`}>
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="space-y-2">
          <Badge variant="secondary">{workspace.name}</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Rooms</h1>
          <p className="text-muted-foreground">
            See which areas are packed, cleaned, or falling behind.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="size-4 text-primary" aria-hidden />
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{rooms.length}</p>
            <p className="text-sm text-muted-foreground">Move areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" aria-hidden />
              Open work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalIncomplete}</p>
            <p className="text-sm text-muted-foreground">Incomplete tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className={cn(
                  "size-4",
                  totalOverdue > 0 ? "text-destructive" : "text-primary",
                )}
                aria-hidden
              />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalOverdue}</p>
            <p className="text-sm text-muted-foreground">Across rooms</p>
          </CardContent>
        </Card>
      </div>

      {roomProgress.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roomProgress.map((progress) => (
            <Link
              className="block"
              href={`/app/workspaces/${workspaceId}/rooms/${progress.room.id}`}
              key={progress.room.id}
            >
              <Card className="h-full transition-colors hover:bg-accent/45">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">
                        {progress.room.name}
                      </CardTitle>
                      <CardDescription>
                        {progress.incompleteTasks} open of {progress.totalTasks}
                      </CardDescription>
                    </div>
                    {progress.overdueTasks > 0 ? (
                      <Badge variant="destructive">
                        {progress.overdueTasks} overdue
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <CheckCircle2 aria-hidden="true" />
                        {progress.completionPercentage}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        progress.overdueTasks > 0 ? "bg-destructive" : "bg-primary",
                      )}
                      style={{ width: `${progress.completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progress.completedTasks} complete, {progress.incompleteTasks} remaining
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No rooms yet. Create a seeded workspace to start with the default room list.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
