import { CalendarDays, Home, ListChecks, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppHomePage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">Protected app shell</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
            Your move command center
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Workspace setup, shared tasks, rooms, people, and move-day views
            will build on this protected shell in the next milestones.
          </p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Create a workspace",
            body: "Capture the move date, addresses, and starter template.",
            icon: Home,
          },
          {
            title: "Coordinate tasks",
            body: "Track ownership, urgency, rooms, and completion.",
            icon: ListChecks,
          },
          {
            title: "Move day clarity",
            body: "Keep the phone checklist focused when the day gets busy.",
            icon: CalendarDays,
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="size-5" aria-hidden="true" />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Next milestone</h2>
            <p className="text-sm text-muted-foreground">
              Database schema, indexes, RLS policies, and secure workspace
              access.
            </p>
          </div>
          <Button disabled>
            <Plus aria-hidden="true" />
            New workspace
          </Button>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Workspace creation is intentionally disabled until Milestone 3.
      </p>
    </div>
  );
}
