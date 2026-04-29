import { type NextRequest } from "next/server";

import { handleAuthCallback } from "@/lib/auth/callback";

type CallbackRouteContext = {
  params: Promise<{
    encodedNextPath: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: CallbackRouteContext,
) {
  const { encodedNextPath } = await params;

  return handleAuthCallback(request, encodedNextPath);
}
