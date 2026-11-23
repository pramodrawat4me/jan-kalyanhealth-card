import { Badge } from "./Badge";

/** Turns a raw validity date into a semantic status — the admin/partner
 * audits both flagged dates sitting in a badge with no indication of
 * whether they're good or a problem. Never color-only: the label text
 * itself always says Valid/Expiring/Expired. */
export function ValidityBadge({ validityDate }: Readonly<{ validityDate: string }>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(validityDate);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <Badge tone="danger">Expired</Badge>;
  }
  if (daysLeft <= 30) {
    return <Badge tone="muted">Expiring soon</Badge>;
  }
  return <Badge tone="success">Valid</Badge>;
}
