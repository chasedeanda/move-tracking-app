import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getAuthCallbackUrl } from "@/lib/auth/redirects";

const templatesDir = join(process.cwd(), "supabase", "templates");

describe("Supabase auth email templates", () => {
  it("uses query-bearing RedirectTo callback URLs for SSR token verification", () => {
    const magicLink = readFileSync(join(templatesDir, "magic_link.html"), "utf8");
    const confirmation = readFileSync(
      join(templatesDir, "confirmation.html"),
      "utf8",
    );

    expect(magicLink).toContain("{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink");
    expect(confirmation).toContain("{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup");
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

  it("renders a production magic link with valid query parameters end to end", () => {
    const magicLink = readFileSync(join(templatesDir, "magic_link.html"), "utf8");
    const redirectTo = getAuthCallbackUrl({
      get(name: string) {
        const values: Record<string, string> = {
          "x-forwarded-host": "move-tracking-app.vercel.app",
          "x-forwarded-proto": "https",
        };

        return values[name.toLowerCase()] ?? null;
      },
    });
    const renderedHtml = magicLink
      .replaceAll("{{ .RedirectTo }}", redirectTo)
      .replaceAll("{{ .TokenHash }}", "pkce_test_hash");
    const href = renderedHtml.match(/href="([^"]+)"/)?.[1];

    expect(href).toBeDefined();

    const url = new URL(href ?? "");
    expect(url.origin).toBe("https://move-tracking-app.vercel.app");
    expect(url.pathname).toMatch(/^\/auth\/callback\/next_/);
    expect(url.searchParams.get("token_hash")).toBe("pkce_test_hash");
    expect(url.searchParams.get("type")).toBe("magiclink");
    expect(url.href).not.toContain("/auth/callback&token_hash");
  });
});
