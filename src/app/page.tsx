import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Home as HomeIcon,
  ListChecks,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-dvh">
      <section className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-between px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HomeIcon className="size-5" aria-hidden="true" />
            </span>
            Move Nest
          </Link>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
        <div className="grid items-end gap-8 py-14 md:grid-cols-[1.08fr_0.92fr] md:py-20">
          <div className="space-y-7">
            <Badge variant="secondary">Shared moving checklist</Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-7xl">
                A calmer way to move together.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Coordinate packing, cleaning, utilities, rooms, and move-day
                tasks in one warm household workspace.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Start your move
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/app">Open app</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              {
                title: "What still needs doing",
                body: "Tasks stay grouped by urgency, room, owner, and due date.",
                icon: ListChecks,
              },
              {
                title: "Who owns it",
                body: "One clear assignee per task keeps the MVP simple.",
                icon: Users,
              },
              {
                title: "What is urgent",
                body: "Overdue, due soon, and move-day work is easy to spot.",
                icon: CheckCircle2,
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader className="flex-row items-start gap-4 space-y-0">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.body}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
