import { Skeleton } from "@/components/ui/skeleton";

export default function PageLoader() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page title */}
      <Skeleton className="h-9 w-48" />

      {/* Subtitle */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>

      {/* Table-like rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    </div>
  );
}
