import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

import { decodeNextPath } from "@/lib/auth/redirects";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { setSupabaseSessionCookies } from "@/lib/supabase/session-cookies";

const otpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function safeRedirectUrl(request: NextRequest, next: string) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol;
  const origin = `${protocol.replace(":", "")}://${host}`;
  const candidateUrl = new URL(next, origin);

  if (candidateUrl.origin !== origin) {
    return new URL("/app", origin);
  }

  return candidateUrl;
}

export async function handleAuthCallback(
  request: NextRequest,
  encodedNextPath?: string,
) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = encodedNextPath
    ? decodeNextPath(encodedNextPath)
    : requestUrl.searchParams.get("next") ?? "/app";
  const response = NextResponse.redirect(safeRedirectUrl(request, next));
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data.session) {
        setSupabaseSessionCookies(response, url, data.session);
      }

      return response;
    }
  }

  if (tokenHash && type && otpTypes.has(type as EmailOtpType)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      if (data.session) {
        setSupabaseSessionCookies(response, url, data.session);
      }

      return response;
    }
  }

  return NextResponse.redirect(
    new URL("/login?message=auth-callback-error", requestUrl.origin),
  );
}
