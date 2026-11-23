import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-line">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4h8l1.5 3h-11L8 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13.8 15.8 15.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-sm font-medium text-navy">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
