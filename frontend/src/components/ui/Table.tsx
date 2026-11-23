import type { KeyboardEvent, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/70 bg-white/90 shadow-[0_2px_8px_rgba(9,60,113,0.05)]">
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line/70 bg-gradient-to-r from-teal-light via-teal-light/70 to-brand-green-light">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line/60">{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  /** When given, the whole row becomes the click target — not just whatever
   * inner `Link`/button happens to be in one cell. Without this, rows that
   * highlight on hover but only respond to clicks in a single cell left the
   * pointer cursor showing up nowhere near where the hover feedback was. */
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: Readonly<TableRowProps>) {
  if (!onClick) {
    return <tr className={cn("transition-colors hover:bg-teal-light/40", className)}>{children}</tr>;
  }

  const handleActivate = onClick;

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={cn("cursor-pointer transition-colors hover:bg-teal-light/40", className)}
    >
      {children}
    </tr>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-teal/80", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-navy", className)} {...rest}>
      {children}
    </td>
  );
}
