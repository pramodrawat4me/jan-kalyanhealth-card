import type { ReactElement } from "react";

import { Card } from "./Card";

type Tone = "default" | "teal" | "navy" | "amber";

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: Tone;
  icon?: (props: Readonly<{ className?: string }>) => ReactElement;
  hint?: string;
}

const toneClasses: Record<Tone, { value: string; iconWrap: string; accent: string }> = {
  default: { value: "text-navy", iconWrap: "bg-surface text-navy", accent: "from-navy/30 to-navy/5" },
  teal: { value: "text-teal", iconWrap: "bg-gradient-to-br from-teal-light to-teal-light/40 text-teal", accent: "from-teal to-brand-green" },
  navy: { value: "text-navy", iconWrap: "bg-navy/10 text-navy", accent: "from-navy/50 to-navy/10" },
  amber: { value: "text-amber-600", iconWrap: "bg-amber-50 text-amber-600", accent: "from-amber-400 to-amber-200" },
};

/** Dashboard KPI tile. The icon badge, top accent, and hover-lift are
 * purely visual — every value still comes straight from the existing
 * summary payload, no new backend aggregation was introduced to support
 * this. */
export function StatTile({ label, value, tone = "default", icon: Icon, hint }: Readonly<StatTileProps>) {
  const tones = toneClasses[tone];
  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tones.accent}`} aria-hidden="true" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tones.iconWrap}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className={`text-2xl font-semibold ${tones.value}`}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}
