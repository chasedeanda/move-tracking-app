import { Mail } from "lucide-react";

import { signInWithMagicLink } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  return (
    <form action={signInWithMagicLink} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <Button className="h-12 w-full" type="submit">
        <Mail aria-hidden="true" />
        Send magic link
      </Button>
    </form>
  );
}
