import { Badge } from "./Badge";
import { formatDisplayDateTime } from "../../lib/date";

/** Mirrors `ValidityBadge` — turns a customer's last print event into a
 * semantic status visible on both the partner and admin sides, so "has this
 * card actually been printed" doesn't require an admin to dig into the
 * print activity log to answer. `compact` drops the timestamp for tight
 * table cells; detail pages show the full "Printed · <when>" form. */
export function PrintBadge({
  lastPrintedAt,
  compact,
}: Readonly<{ lastPrintedAt: string | null; compact?: boolean }>) {
  if (!lastPrintedAt) {
    return <Badge tone="muted">Not Printed</Badge>;
  }
  return <Badge tone="success">{compact ? "Printed" : `Printed · ${formatDisplayDateTime(lastPrintedAt)}`}</Badge>;
}
