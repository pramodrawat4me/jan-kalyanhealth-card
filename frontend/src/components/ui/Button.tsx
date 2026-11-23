import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-teal text-white hover:bg-teal-hover disabled:bg-teal/50",
  secondary: "bg-white text-teal border border-teal hover:bg-teal-light disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-danger-hover disabled:bg-danger/50",
  ghost: "bg-transparent text-navy hover:bg-surface disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading, fullWidth, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {isLoading && <Spinner size={16} className={variant === "primary" || variant === "danger" ? "text-white" : undefined} />}
      {children}
    </button>
  );
});
