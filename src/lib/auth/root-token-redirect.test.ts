import { describe, expect, it } from "vitest";

import { getRootTokenRedirect } from "@/lib/auth/root-token-redirect";

describe("root auth token redirect", () => {
  it("redirects production root magic links to the auth callback", () => {
    expect(
      getRootTokenRedirect({
        token_hash: "pkce_7c15dd6fcaae6a473b8a8aa36d2070a32db0c74bc9fc10781e84c9f6",
        type: "magiclink",
      }),
    ).toBe(
      "/auth/callback?token_hash=pkce_7c15dd6fcaae6a473b8a8aa36d2070a32db0c74bc9fc10781e84c9f6&type=magiclink",
    );
  });

  it("ignores normal homepage requests", () => {
    expect(getRootTokenRedirect({})).toBeNull();
    expect(getRootTokenRedirect({ token_hash: "pkce_test" })).toBeNull();
    expect(
      getRootTokenRedirect({ token_hash: "pkce_test", type: "not-real" }),
    ).toBeNull();
  });
});
