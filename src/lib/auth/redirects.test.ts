import { afterEach, describe, expect, it } from "vitest";

import {
  decodeNextPath,
  getAppOrigin,
  getAuthCallbackUrl,
} from "@/lib/auth/redirects";

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
    ).toMatch(
      /^https:\/\/move-tracking-app\.vercel\.app\/auth\/callback\/next_/,
    );
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
    ).toMatch(
      /^https:\/\/move-tracking-app\.vercel\.app\/auth\/callback\/next_/,
    );
  });

  it("encodes invitation accept paths into callback URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://move-tracking-app.vercel.app";

    const callbackUrl = new URL(
      getAuthCallbackUrl(
        headers({ host: "move-tracking-app.vercel.app" }),
        "/app/invitations/accept?token=abc123",
      ),
    );

    expect(callbackUrl.search).toBe("");
    expect(decodeNextPath(callbackUrl.pathname.split("/").at(-1) ?? null)).toBe(
      "/app/invitations/accept?token=abc123",
    );
  });

  it("decodes invalid callback paths to the app home", () => {
    expect(decodeNextPath("not-valid")).toBe("/app");
  });
});
