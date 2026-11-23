import { type InputHTMLAttributes, forwardRef, useState } from "react";

import { cn } from "../../lib/cn";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { invalid, className, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 pr-11 text-sm text-navy placeholder:text-muted",
          "transition-colors duration-150 focus:border-teal focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal/20",
          invalid ? "border-danger" : "border-line",
          className,
        )}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-navy"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M9.4 5.5A10.6 10.6 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.2 2.6-2.4 3.9M6.2 7.5C4.3 8.9 3 10.9 2 12c1 3 5 7 10 7 1.1 0 2.1-.2 3-.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </button>
    </div>
  );
});
