type HeaderReader = {
  get(name: string): string | null;
};

function normalizeOrigin(value: string) {
  const trimmedValue = value.trim().replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  return new URL(withProtocol).origin;
}

export function getAppOrigin(headers?: HeaderReader) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL;

  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

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

  return "http://127.0.0.1:4000";
}

export function getAuthCallbackUrl(headers: HeaderReader, nextPath = "/app") {
  const callbackUrl = new URL("/auth/callback", getAppOrigin(headers));
  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
}
