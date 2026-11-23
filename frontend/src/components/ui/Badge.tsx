import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type Tone = "teal" | "danger" | "muted" | "success";

const toneClasses: Record<Tone, string> = {
  teal: "bg-teal-light text-teal",
  danger: "bg-danger/10 text-danger",
  muted: "bg-surface text-muted",
  success: "bg-brand-green-light text-brand-green",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  );
}
