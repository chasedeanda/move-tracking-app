const authTokenTypes = new Set([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export function getRootTokenRedirect(searchParams: {
  token_hash?: string;
  type?: string;
}) {
  if (
    !searchParams.token_hash ||
    !searchParams.type ||
    !authTokenTypes.has(searchParams.type)
  ) {
    return null;
  }

  const callbackParams = new URLSearchParams({
    token_hash: searchParams.token_hash,
    type: searchParams.type,
  });

  return `/auth/callback?${callbackParams.toString()}`;
}
