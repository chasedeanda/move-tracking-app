import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";

import {
  createSupabaseSessionCookieChunks,
  getSupabaseAuthCookieName,
} from "@/lib/supabase/session-cookies";

const supabaseUrl = "https://qadrmzxhsmmbqleujvjp.supabase.co";

function decodeCookieValue(value: string) {
  expect(value.startsWith("base64-")).toBe(true);

  return JSON.parse(
    Buffer.from(value.slice("base64-".length), "base64url").toString("utf8"),
  ) as Session;
}

describe("Supabase session cookies", () => {
  it("uses the Supabase project ref in the auth cookie name", () => {
    expect(getSupabaseAuthCookieName(supabaseUrl)).toBe(
      "sb-qadrmzxhsmmbqleujvjp-auth-token",
    );
  });

  it("encodes a normal session as the cookie format expected by @supabase/ssr", () => {
    const session = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      expires_at: 1_800_000_000,
      token_type: "bearer",
      user: {
        id: "user-id",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2026-04-28T00:00:00.000Z",
      },
    } satisfies Session;

    const chunks = createSupabaseSessionCookieChunks(supabaseUrl, session);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].name).toBe("sb-qadrmzxhsmmbqleujvjp-auth-token");
    expect(decodeCookieValue(chunks[0].value)).toMatchObject({
      access_token: "access-token",
      refresh_token: "refresh-token",
      user: { id: "user-id" },
    });
  });

  it("chunks large sessions without losing data", () => {
    const session = {
      access_token: "a".repeat(5000),
      refresh_token: "refresh-token",
      expires_in: 3600,
      expires_at: 1_800_000_000,
      token_type: "bearer",
      user: {
        id: "user-id",
        app_metadata: {},
        user_metadata: {
          bio: "x".repeat(2000),
        },
        aud: "authenticated",
        created_at: "2026-04-28T00:00:00.000Z",
      },
    } satisfies Session;

    const chunks = createSupabaseSessionCookieChunks(supabaseUrl, session);
    const combinedValue = chunks.map((chunk) => chunk.value).join("");

    expect(chunks.length).toBeGreaterThan(1);
    expect(decodeCookieValue(combinedValue)).toMatchObject({
      access_token: "a".repeat(5000),
      user: { user_metadata: { bio: "x".repeat(2000) } },
    });
  });
});
