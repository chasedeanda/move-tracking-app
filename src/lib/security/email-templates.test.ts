import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const templatesDir = join(process.cwd(), "supabase", "templates");

describe("Supabase auth email templates", () => {
  it("uses RedirectTo so invite links preserve the invitation accept URL", () => {
    const magicLink = readFileSync(join(templatesDir, "magic_link.html"), "utf8");
    const confirmation = readFileSync(
      join(templatesDir, "confirmation.html"),
      "utf8",
    );

    expect(magicLink).toContain("{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink");
    expect(confirmation).toContain("{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup");
    expect(magicLink).not.toContain("next=/app");
    expect(confirmation).not.toContain("next=/app");
  });

  it("passes a query-bearing callback URL for regular magic links", () => {
    const action = readFileSync(
      join(process.cwd(), "src", "app", "login", "actions.ts"),
      "utf8",
    );

    expect(action).toContain("emailRedirectTo: `${origin}/auth/callback?next=/app`");
  });
});
