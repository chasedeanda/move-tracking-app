import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

describe("Supabase access-control migrations", () => {
  it("enables RLS on every public MVP table", () => {
    for (const table of [
      "profiles",
      "workspaces",
      "workspace_members",
      "rooms",
      "tasks",
      "subtasks",
      "activity_log",
    ]) {
      expect(migrations).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
  });

  it("uses membership checks for workspace-scoped reads and task mutations", () => {
    expect(migrations).toContain("public.is_workspace_member(workspace_id)");
    expect(migrations).toContain("using (public.is_workspace_member(id))");
    expect(migrations).toContain("with check (\n    public.is_workspace_member(workspace_id)");
  });

  it("keeps workspace settings and membership management owner-only", () => {
    expect(migrations).toContain("public.is_workspace_owner(id)");
    expect(migrations).toContain("public.is_workspace_owner(workspace_id)");
    expect(migrations).toContain("not public.is_workspace_owner(p_workspace_id)");
    expect(migrations).toContain("grant execute on function public.add_workspace_member_by_email");
  });

  it("protects app routes from unauthenticated users in the app layout", () => {
    const layout = readFileSync(
      join(process.cwd(), "src", "app", "app", "layout.tsx"),
      "utf8",
    );

    expect(layout).toContain("supabase.auth.getUser()");
    expect(layout).toContain('redirect("/login")');
  });
});
