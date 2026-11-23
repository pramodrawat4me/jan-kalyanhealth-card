import type { ReactElement, ReactNode } from "react";

/** One labelled fact row with a leading icon chip — the building block for
 * "everything about this account/record" panels (Profile, Partner Details,
 * public card status) so they read as a real detail sheet rather than the
 * two-or-three-fact stub these pages started as. */
export function DetailRow({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: (props: Readonly<{ className?: string }>) => ReactElement;
  label: string;
  value: ReactNode;
}>) {
  return (
    <div className="flex items-center gap-3 border-t border-line/60 py-3 first:border-t-0">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-navy">{value}</p>
      </div>
    </div>
  );
}
