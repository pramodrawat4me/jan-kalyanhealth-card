import { type TextareaHTMLAttributes, forwardRef } from "react";

import { cn } from "../../lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        "w-full resize-none rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-navy placeholder:text-muted",
        "transition-colors duration-150 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20",
        invalid ? "border-danger" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});
