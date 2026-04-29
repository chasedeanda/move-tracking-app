type HeaderReader = {
  get(name: string): string | null;
};

const nextPrefix = "next_";

function normalizeOrigin(value: string) {
  const trimmedValue = value.trim().replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  return new URL(withProtocol).origin;
}

function isLocalOrigin(origin: string) {
  const { hostname } = new URL(normalizeOrigin(origin));

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getHeaderOrigin(headers?: HeaderReader) {
  const forwardedHost = headers?.get("x-forwarded-host");
  const host = forwardedHost ?? headers?.get("host");

  if (host) {
    const protocol =
      headers?.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    return normalizeOrigin(`${protocol}://${host}`);
  }

  const requestOrigin = headers?.get("origin");

  if (requestOrigin) {
    return normalizeOrigin(requestOrigin);
  }

  return null;
}

export function getAppOrigin(headers?: HeaderReader) {
  const headerOrigin = getHeaderOrigin(headers);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (
    siteUrl &&
    !(headerOrigin && isLocalOrigin(siteUrl) && !isLocalOrigin(headerOrigin))
  ) {
    return normalizeOrigin(siteUrl);
  }

  const vercelOrigin = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;

  if (vercelOrigin) {
    return normalizeOrigin(vercelOrigin);
  }

  if (headerOrigin) {
    return headerOrigin;
  }

  return "http://127.0.0.1:4000";
}

function encodeNextPath(nextPath: string) {
  return `${nextPrefix}${Buffer.from(nextPath, "utf8").toString("base64url")}`;
}

export function decodeNextPath(encodedNextPath: string | null) {
  if (!encodedNextPath?.startsWith(nextPrefix)) {
    return "/app";
  }

  try {
    const decoded = Buffer.from(
      encodedNextPath.slice(nextPrefix.length),
      "base64url",
    ).toString("utf8");

    return decoded.startsWith("/") ? decoded : "/app";
  } catch {
    return "/app";
  }
}

export function getAuthCallbackUrl(headers: HeaderReader, nextPath = "/app") {
  const callbackUrl = new URL(
    `/auth/callback/${encodeNextPath(nextPath)}`,
    getAppOrigin(headers),
  );

  return callbackUrl.toString();
}
