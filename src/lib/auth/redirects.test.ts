import { afterEach, describe, expect, it } from "vitest";

import { getAppOrigin, getAuthCallbackUrl } from "@/lib/auth/redirects";

function headers(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("auth redirect helpers", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalVercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  const originalServerVercelUrl = process.env.VERCEL_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    process.env.NEXT_PUBLIC_VERCEL_URL = originalVercelUrl;
    process.env.VERCEL_URL = originalServerVercelUrl;
  });

  it("uses NEXT_PUBLIC_SITE_URL as the canonical production origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://moves.example.com/";
    process.env.NEXT_PUBLIC_VERCEL_URL = "preview.vercel.app";

    expect(getAppOrigin(headers({ host: "127.0.0.1:4000" }))).toBe(
      "https://moves.example.com",
    );
  });

  it("does not let a localhost site URL override a production request host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:4000";
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.VERCEL_URL;

    expect(
      getAuthCallbackUrl(
        headers({
          "x-forwarded-host": "move-tracking-app.vercel.app",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://move-tracking-app.vercel.app/auth/callback?next=%2Fapp");
  });

  it("falls back to forwarded host instead of a hard-coded localhost origin", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.VERCEL_URL;

    expect(
      getAuthCallbackUrl(
        headers({
          "x-forwarded-host": "move-tracking-app.vercel.app",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://move-tracking-app.vercel.app/auth/callback?next=%2Fapp");
  });

  it("encodes invitation accept paths into callback URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://move-tracking-app.vercel.app";

    expect(
      getAuthCallbackUrl(
        headers({ host: "move-tracking-app.vercel.app" }),
        "/app/invitations/accept?token=abc123",
      ),
    ).toBe(
      "https://move-tracking-app.vercel.app/auth/callback?next=%2Fapp%2Finvitations%2Faccept%3Ftoken%3Dabc123",
    );
  });
});
