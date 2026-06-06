import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 6, columns = 5, className }: TableSkeletonProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}
      role="status"
      aria-label="Loading data"
    >
      <div
        className="grid gap-px bg-border"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`h-${i}`} className="bg-muted/50 px-4 py-3">
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
        {Array.from({ length: rows * columns }).map((_, i) => (
          <div key={`c-${i}`} className="bg-card px-4 py-3">
            <Skeleton className="h-4 w-full max-w-[160px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
