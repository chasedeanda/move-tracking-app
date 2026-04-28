import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({
  title = "Loading workspace",
}: {
  title?: string;
}) {
  return (
    <div className="space-y-6" role="status" aria-label={title}>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
