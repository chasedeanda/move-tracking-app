import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";

import { RoomScanFlow } from "@/components/rooms/room-scan-flow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Room, Task, Workspace } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

type RoomScanPageProps = {
  params: Promise<{
    workspaceId: string;
    roomId: string;
  }>;
};

export default async function RoomScanPage({ params }: RoomScanPageProps) {
  const { workspaceId, roomId } = await params;
  const supabase = await createClient();
  const [workspaceResult, roomResult, tasksResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single<Workspace>(),
    supabase
      .from("rooms")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", roomId)
      .single<Room>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("room_id", roomId)
      .returns<Task[]>(),
  ]);

  if (workspaceResult.error || !workspaceResult.data) {
    notFound();
  }

  if (roomResult.error || !roomResult.data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="space-y-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href={`/app/workspaces/${workspaceId}/rooms/${roomId}`}>
            <ArrowLeft aria-hidden="true" />
            {roomResult.data.name}
          </Link>
        </Button>
        <div className="space-y-2">
          <Badge variant="secondary">{workspaceResult.data.name}</Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Camera className="size-5" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">Scan room</h1>
          </div>
          <p className="text-muted-foreground">
            Take up to four photos, add short notes, and review suggested tasks
            before anything is saved.
          </p>
        </div>
      </section>

      <RoomScanFlow
        existingTaskCount={(tasksResult.data ?? []).length}
        roomName={roomResult.data.name}
        roomUrl={`/app/workspaces/${workspaceId}/rooms/${roomId}`}
        workspaceId={workspaceId}
        roomId={roomId}
      />
    </div>
  );
}
