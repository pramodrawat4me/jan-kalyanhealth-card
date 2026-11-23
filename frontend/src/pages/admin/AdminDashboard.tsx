import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchDashboardSummary, listPartners } from "../../api/admin";
import type { PartnerAdmin } from "../../api/types";
import { Avatar } from "../../components/ui/Avatar";
import { SkeletonListRow, SkeletonStatTile } from "../../components/ui/Skeleton";
import { StatTile } from "../../components/ui/StatTile";
import {
  Building2Icon,
  FileTextIcon,
  HospitalIcon,
  IdCardIcon,
  MapPinIcon,
  PrinterIcon,
  SettingsIcon,
  UserPlusIcon,
  UsersIcon,
} from "../../components/icons";

const QUICK_ACTIONS = [
  { to: "/admin/partners", label: "New Partner", description: "Onboard a partner account", icon: UserPlusIcon },
  { to: "/admin/customers", label: "Customers", description: "Search across every partner", icon: UsersIcon },
  { to: "/admin/reports", label: "Printing Reports", description: "Export per-partner totals", icon: FileTextIcon },
  { to: "/admin/hospitals", label: "Hospitals", description: "Manage empanelled directory", icon: HospitalIcon },
  { to: "/admin/locations", label: "Locations", description: "States, cities & tahsils", icon: MapPinIcon },
  { to: "/admin/card-settings", label: "Card Settings", description: "Facilities, fee & helpline", icon: SettingsIcon },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Ranks the partners already returned by `/admin/partners` — no new
 * backend aggregation, just a client-side sort of data the page needs
 * anyway to render a leaderboard of who's actually driving registrations. */
function TopPartnersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners", "top"],
    queryFn: () => listPartners(1, 100),
  });

  const topPartners = (data?.data ?? [])
    .slice()
    .sort((a, b) => b.customer_count - a.customer_count)
    .slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy">Top Partners</p>
        <Link to="/admin/partners" className="text-xs font-medium text-teal hover:underline">
          View all partners
        </Link>
      </div>

      <TopPartnersPanelBody isLoading={isLoading} partners={topPartners} />
    </div>
  );
}

function TopPartnersPanelBody({
  isLoading,
  partners,
}: Readonly<{ isLoading: boolean; partners: PartnerAdmin[] }>) {
  if (isLoading) {
    return (
      <div className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
        <Building2Icon className="h-8 w-8 text-line" />
        <p className="text-sm text-muted">No partners registered yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {partners.map((partner, index) => (
        <li key={partner.id}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-light text-xs font-semibold text-teal">
              {index + 1}
            </span>
            <Avatar src={partner.photo_url} name={partner.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy">{partner.name}</p>
              <p className="text-xs text-muted">{partner.mobile}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-teal">{partner.customer_count}</p>
              <p className="text-[11px] text-muted">customers</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: fetchDashboardSummary });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-navy">{greeting()}, Admin</h1>
        <p className="mt-1 text-sm text-muted">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Platform-wide
          activity at a glance
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {isLoading || !data ? (
          <>
            <SkeletonStatTile />
            <SkeletonStatTile />
            <SkeletonStatTile />
            <SkeletonStatTile />
            <SkeletonStatTile />
          </>
        ) : (
          <>
            <StatTile label="Total Cards Issued" value={data.total_cards_issued} tone="teal" icon={IdCardIcon} />
            <StatTile label="Cards Printed Today" value={data.cards_printed_today} tone="teal" icon={PrinterIcon} />
            <StatTile label="Active Partners" value={data.active_partners} icon={UsersIcon} />
            <StatTile label="Total Partners" value={data.total_partners} icon={Building2Icon} />
            <StatTile label="Empanelled Hospitals" value={data.hospital_count} icon={HospitalIcon} />
          </>
        )}
      </div>

      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold text-navy">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col gap-2 rounded-xl border border-line/70 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light text-teal">
                <action.icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">{action.label}</p>
                <p className="mt-0.5 hidden text-xs text-muted sm:block">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <TopPartnersPanel />
    </div>
  );
}
