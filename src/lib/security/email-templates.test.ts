import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const templatesDir = join(process.cwd(), "supabase", "templates");

describe("Supabase auth email templates", () => {
  it("uses query-bearing RedirectTo callback URLs for SSR token verification", () => {
    const magicLink = readFileSync(join(templatesDir, "magic_link.html"), "utf8");
    const confirmation = readFileSync(
      join(templatesDir, "confirmation.html"),
      "utf8",
    );

    expect(magicLink).toContain("{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink");
    expect(confirmation).toContain("{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup");
    expect(magicLink).not.toContain("{{ .ConfirmationURL }}");
    expect(confirmation).not.toContain("{{ .ConfirmationURL }}");
    expect(magicLink).not.toContain("next=/app");
    expect(confirmation).not.toContain("next=/app");
  });

  it("passes a callback URL through the shared redirect helper", () => {
    const action = readFileSync(
      join(process.cwd(), "src", "app", "login", "actions.ts"),
      "utf8",
    );

    expect(action).toContain("emailRedirectTo: getAuthCallbackUrl(headerStore)");
  });

  it("does not configure live auth to fall back to localhost-only redirects", () => {
    const config = readFileSync(
      join(process.cwd(), "supabase", "config.toml"),
      "utf8",
    );

    expect(config).toContain('site_url = "https://move-tracking-app.vercel.app"');
    expect(config).toContain('"http://127.0.0.1:4000/**"');
    expect(config).toContain('"https://move-tracking-app.vercel.app/**"');
    expect(config).not.toContain('site_url = "http://127.0.0.1:4000"');
  });
});
