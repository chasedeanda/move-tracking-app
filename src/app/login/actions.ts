"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const magicLinkSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export async function signInWithMagicLink(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirect("/login?message=missing-config");
  }

  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/login?message=invalid-email");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/app`,
    },
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=check-email");
}
