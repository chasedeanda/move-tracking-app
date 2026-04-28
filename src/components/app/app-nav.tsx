import Link from "next/link";
import {
  CheckSquare,
  Home,
  LayoutDashboard,
  PackageOpen,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/app/actions";
import { createClient } from "@/lib/supabase/server";

export async function AppNav() {
  const supabase = await createClient();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const workspaceId = workspaces?.[0]?.id;
  const workspaceBase = workspaceId ? `/app/workspaces/${workspaceId}` : "/app";
  const navItems = [
    { href: workspaceBase, label: "Home", icon: Home },
    {
      href: workspaceId ? `${workspaceBase}/tasks` : "/app",
      label: "Tasks",
      icon: CheckSquare,
    },
    {
      href: workspaceId ? `${workspaceBase}/rooms` : "/app",
      label: "Rooms",
      icon: PackageOpen,
    },
    {
      href: workspaceId ? `${workspaceBase}/people` : "/app",
      label: "People",
      icon: Users,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link className="flex items-center gap-2 font-semibold" href="/app">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </span>
            Move Nest
          </Link>
          <nav aria-label="Workspace" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button asChild key={item.label} size="sm" variant="ghost">
                <Link href={item.href}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <form action={signOut}>
            <Button size="sm" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => (
            <Link
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
