import { cn } from "../../lib/cn";

export interface TabOption {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Segmented tab control — used to split one dataset into purpose-driven
 * views (e.g. Printing: Today vs History) instead of two near-duplicate
 * pages, per the audit finding that Today's Card and Total Printing read
 * as clones of each other. */
export function Tabs({ options, value, onChange, className }: Readonly<TabsProps>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex gap-1 rounded-lg bg-surface p-1", className)}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
              isActive ? "bg-white text-teal shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-semibold",
                  isActive ? "bg-teal-light text-teal" : "bg-line/60 text-muted",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
