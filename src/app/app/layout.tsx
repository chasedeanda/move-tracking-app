import { redirect } from "next/navigation";

import { AppNav } from "@/components/app/app-nav";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!hasSupabaseConfig()) {
    redirect("/login?message=missing-config");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
