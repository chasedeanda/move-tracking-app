import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";

const maxChunkSize = 3180;
const cookieMaxAge = 400 * 24 * 60 * 60;

export function getSupabaseAuthCookieName(supabaseUrl: string) {
  const hostname = new URL(supabaseUrl).hostname;
  const projectRef = hostname.split(".")[0];

  return `sb-${projectRef}-auth-token`;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function createCookieChunks(name: string, value: string) {
  const encodedValue = encodeURIComponent(value);

  if (encodedValue.length <= maxChunkSize) {
    return [{ name, value }];
  }

  const chunks: string[] = [];
  let remaining = encodedValue;

  while (remaining.length > 0) {
    let encodedHead = remaining.slice(0, maxChunkSize);
    const lastEscapePosition = encodedHead.lastIndexOf("%");

    if (lastEscapePosition > maxChunkSize - 3) {
      encodedHead = encodedHead.slice(0, lastEscapePosition);
    }

    let chunk = "";

    while (encodedHead.length > 0) {
      try {
        chunk = decodeURIComponent(encodedHead);
        break;
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedHead.at(-3) === "%" &&
          encodedHead.length > 3
        ) {
          encodedHead = encodedHead.slice(0, encodedHead.length - 3);
        } else {
          throw error;
        }
      }
    }

    chunks.push(chunk);
    remaining = remaining.slice(encodedHead.length);
  }

  return chunks.map((chunk, index) => ({
    name: `${name}.${index}`,
    value: chunk,
  }));
}

export function createSupabaseSessionCookieChunks(
  supabaseUrl: string,
  session: Session,
) {
  const cookieName = getSupabaseAuthCookieName(supabaseUrl);
  const cookieValue = `base64-${encodeBase64Url(JSON.stringify(session))}`;

  return createCookieChunks(cookieName, cookieValue);
}

export function setSupabaseSessionCookies(
  response: NextResponse,
  supabaseUrl: string,
  session: Session,
) {
  const cookieName = getSupabaseAuthCookieName(supabaseUrl);
  const chunks = createSupabaseSessionCookieChunks(supabaseUrl, session);
  const chunkNames = new Set(chunks.map((chunk) => chunk.name));
  const baseOptions = {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  } satisfies Partial<ResponseCookie>;

  for (const staleName of [
    cookieName,
    ...Array.from({ length: 10 }, (_, index) => `${cookieName}.${index}`),
  ]) {
    if (!chunkNames.has(staleName)) {
      response.cookies.set(staleName, "", {
        ...baseOptions,
        maxAge: 0,
      });
    }
  }

  for (const chunk of chunks) {
    response.cookies.set(chunk.name, chunk.value, {
      ...baseOptions,
      maxAge: cookieMaxAge,
    });
  }
}
