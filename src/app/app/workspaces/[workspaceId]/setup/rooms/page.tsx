import { notFound } from "next/navigation";
import { DoorOpen, Sparkles } from "lucide-react";

import { completeRoomSetup } from "@/app/app/workspaces/[workspaceId]/setup/rooms/actions";
import { RoomSetupForm } from "@/components/workspaces/room-setup-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Workspace } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

type RoomSetupPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RoomSetupPage({
  params,
  searchParams,
}: RoomSetupPageProps) {
  const { workspaceId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single<Workspace>();

  if (workspaceError || !workspace) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">Guided setup</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Which rooms are you moving?
          </h1>
          <p className="text-muted-foreground">
            Choose the spaces in this home. We will add a small baseline
            checklist now, then each room can be scanned for specific tasks.
          </p>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Room setup failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <DoorOpen className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>{workspace.name}</CardTitle>
          <CardDescription>
            Utilities/Admin, Move Day, and Post-Move are always included because
            they keep the household plan complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomSetupForm
            action={completeRoomSetup.bind(null, workspaceId)}
            submitLabel="Create rooms and baseline tasks"
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex gap-3 pt-5">
          <Sparkles className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">Room Scan comes after this step</p>
            <p className="text-sm text-muted-foreground">
              Open a room, take up to four photos, add a short note, and review
              AI-generated tasks before saving anything.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
