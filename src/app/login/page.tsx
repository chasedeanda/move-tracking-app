import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const messages: Record<string, { title: string; body: string }> = {
  "check-email": {
    title: "Check your email",
    body: "Your magic link is on the way. Open it on this device to finish signing in.",
  },
  "invalid-email": {
    title: "Email needs another look",
    body: "Enter a valid email address and try again.",
  },
  "missing-config": {
    title: "Supabase is not configured",
    body: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
  },
  "auth-callback-error": {
    title: "That sign-in link did not work",
    body: "Request a fresh magic link and try again.",
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (data?.claims) {
      redirect("/app");
    }
  }

  const params = await searchParams;
  const message = params.message ? messages[params.message] : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign in to your move</CardTitle>
            <CardDescription>
              Use a magic link to keep your household checklist private and easy
              to share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {message ? (
              <Alert>
                {params.message === "check-email" ? (
                  <CheckCircle2 className="mb-2 size-5 text-primary" />
                ) : (
                  <Info className="mb-2 size-5 text-primary" />
                )}
                <AlertTitle>{message.title}</AlertTitle>
                <AlertDescription>{message.body}</AlertDescription>
              </Alert>
            ) : null}
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
