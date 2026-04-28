import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Workspace view not found</CardTitle>
          <CardDescription>
            This move workspace, room, or checklist may not exist, or you may
            not have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app">
              <Home aria-hidden="true" />
              Back to app
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
