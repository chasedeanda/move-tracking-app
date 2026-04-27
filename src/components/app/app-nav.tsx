import Link from "next/link";
import {
  CheckSquare,
  Home,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/app/actions";

const navItems = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app", label: "Tasks", icon: CheckSquare },
  { href: "/app", label: "People", icon: Users },
  { href: "/app", label: "Settings", icon: Settings },
];

export function AppNav() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="flex items-center gap-2 font-semibold" href="/app">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" aria-hidden="true" />
            </span>
            Move Nest
          </Link>
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
