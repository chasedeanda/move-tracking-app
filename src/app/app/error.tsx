"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="size-4" aria-hidden />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          The app could not load this workspace view. Try again, or return to
          the app home.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Workspace view failed</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/app">Back to app</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
