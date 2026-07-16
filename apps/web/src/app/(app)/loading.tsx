import { Skeleton } from "@podmind/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-8 h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
