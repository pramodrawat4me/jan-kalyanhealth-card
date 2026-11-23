import { type InputHTMLAttributes, forwardRef } from "react";

import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm text-navy placeholder:text-muted",
        "transition-colors duration-150 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20",
        invalid ? "border-danger" : "border-line",
        rest.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      {...rest}
    />
  );
});
