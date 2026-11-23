import { cn } from "../../lib/cn";

/** Loading placeholder that mirrors the shape of the content it stands in
 * for, so lists/tables/cards don't flash to a blank state and then pop in —
 * see design-system audit note on blocking spinners being the only loading
 * pattern in the app before this. Respects prefers-reduced-motion via the
 * `motion-reduce` utility (falls back to a static tone, no shimmer). */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line/50 motion-reduce:animate-none", className)}
    />
  );
}

/** A row shaped like the Avatar + two-line list rows used across Customers,
 * Today's Card, Total Printing, Find Card results. */
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Skeleton className="h-11 w-11 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonListRows({ count = 5 }: Readonly<{ count?: number }>) {
  return (
    <div className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListRow key={index} />
      ))}
    </div>
  );
}

/** A stat-tile shaped placeholder for dashboard snapshot cards. */
export function SkeletonStatTile() {
  return (
    <div className="rounded-xl border border-line/70 bg-white p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-14" />
    </div>
  );
}

export function SkeletonTableRows({ columns = 4, rows = 6 }: Readonly<{ columns?: number; rows?: number }>) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3.5">
              <Skeleton className="h-3.5 w-full max-w-[10rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
