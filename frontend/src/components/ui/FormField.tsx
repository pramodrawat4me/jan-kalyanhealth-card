import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

interface FormFieldProps {
  label: string;
  hindiLabel?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, hindiLabel, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium tracking-wide text-muted">
        {label}
        {hindiLabel && <span className="font-devanagari"> / {hindiLabel}</span>}
        {required && <span className="text-card-id"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
