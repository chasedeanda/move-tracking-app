import { CalendarDays, Home, PackageCheck } from "lucide-react";

import { createWorkspace } from "@/app/app/workspaces/new/actions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NewWorkspacePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewWorkspacePage({
  searchParams,
}: NewWorkspacePageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-3">
        <Badge variant="secondary">Move setup</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Start your shared move checklist
          </h1>
          <p className="text-muted-foreground">
            Add the basic move details now. The starter template can give your
            household rooms and first tasks in one step.
          </p>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Workspace not created</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Home className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Move details</CardTitle>
          <CardDescription>
            These details power the dashboard countdown and shared workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspace} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Workspace name
              </label>
              <Input
                autoComplete="organization"
                id="name"
                maxLength={120}
                name="name"
                placeholder="Smith family move"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="moveDate">
                  Move date
                </label>
                <div className="relative">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    className="pl-9"
                    id="moveDate"
                    name="moveDate"
                    required
                    type="date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="timezone">
                  Timezone
                </label>
                <Input
                  id="timezone"
                  maxLength={80}
                  name="timezone"
                  required
                  defaultValue="America/Chicago"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="currentAddress"
                >
                  Current address
                </label>
                <Textarea
                  id="currentAddress"
                  name="currentAddress"
                  placeholder="Where you are moving from"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="newAddress">
                  New address
                </label>
                <Textarea
                  id="newAddress"
                  name="newAddress"
                  placeholder="Where you are moving to"
                  required
                  rows={3}
                />
              </div>
            </div>

            <label
              className="flex min-h-16 items-start gap-3 rounded-xl border bg-muted/40 p-4"
              htmlFor="seedTemplate"
            >
              <Checkbox
                className="mt-1"
                defaultChecked
                id="seedTemplate"
                name="seedTemplate"
              />
              <span className="space-y-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <PackageCheck className="size-4" aria-hidden="true" />
                  Add starter rooms and tasks
                </span>
                <span className="block text-sm text-muted-foreground">
                  Includes the requested default rooms plus packing, cleaning,
                  utilities, decluttering, move-day, and post-move tasks.
                </span>
              </span>
            </label>

            <Button className="min-h-12 w-full text-base" size="lg">
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
