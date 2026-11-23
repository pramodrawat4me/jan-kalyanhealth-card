import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        // No `backdrop-blur` — Card renders many times per page (every
        // StatTile, list row, hospital card...), and each instance forces
        // its own GPU compositing layer for a barely-visible effect. A
        // plain semi-opaque background reads almost identically without
        // that cost, which matters most on mobile.
        "rounded-xl border border-line/70 bg-white/95 p-5 shadow-[0_2px_8px_rgba(9,60,113,0.06),0_1px_2px_rgba(9,60,113,0.04)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
