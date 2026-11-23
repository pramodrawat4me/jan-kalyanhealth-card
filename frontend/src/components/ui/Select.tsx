import { type SelectHTMLAttributes, forwardRef } from "react";

import { cn } from "../../lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border bg-surface px-3.5 pr-9 text-sm text-navy",
          "transition-colors duration-150 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20",
          invalid ? "border-danger" : "border-line",
          rest.disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
