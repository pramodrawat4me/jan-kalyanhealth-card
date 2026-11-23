import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { fetchPartnerDashboardSummary } from "../api/cards";
import { listCustomers } from "../api/customers";
import type { CustomerListItem } from "../api/types";
import { OnboardingTour } from "../components/onboarding/OnboardingTour";
import {
  ChevronRightIcon,
  HospitalIcon,
  PrinterIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
} from "../components/icons";
import { Avatar } from "../components/ui/Avatar";
import { SkeletonListRow, SkeletonStatTile } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { useAuthStore } from "../store/authStore";

const QUICK_ACTIONS = [
  { to: "/app/find-card", label: "Find Card", description: "Look up by mobile or ID", icon: SearchIcon },
  { to: "/app/printing", label: "Printing", description: "Today & full history", icon: PrinterIcon },
  { to: "/app/hospitals", label: "Hospitals", description: "Empanelled directory", icon: HospitalIcon },
];

function RecentActivity({
  isLoading,
  customers,
}: Readonly<{ isLoading: boolean; customers: CustomerListItem[] }>) {
  if (isLoading) {
    return (
      <div className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
        <UsersIcon className="h-8 w-8 text-line" />
        <p className="text-sm text-muted">No customers registered yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {customers.map((customer) => (
        <li key={customer.id}>
          <Link
            to={`/app/customers/${customer.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface/60"
          >
            <Avatar src={customer.photo_url} name={customer.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-devanagari text-sm text-navy">
                नाम: {customer.name}, {customer.age}
              </p>
              <p className="text-xs font-semibold text-card-id">{customer.card_id}</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-line" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The Partner Dashboard as an operator's workspace: today's activity and
 * overall position up front, one unmistakable primary action, and recent
 * customers for continuity — replacing the previous six-equal-tile launcher
 * that the audit found had no hierarchy and no data of its own. */
export function DashboardPage() {
  const partner = useAuthStore((state) => state.partner);
  const firstName = partner?.name?.split(" ")[0] ?? "";
  const [tourDismissedLocally, setTourDismissedLocally] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["cards", "dashboard-summary"],
    queryFn: fetchPartnerDashboardSummary,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ["customers", "recent"],
    queryFn: () => listCustomers(1, 5),
  });

  const recentCustomers = recent?.data ?? [];
  const isBrandNew = summary?.total_customers === 0;
  const showTour = partner !== null && !partner.onboarding_completed_at && !tourDismissedLocally;

  return (
    <div>
      {showTour && <OnboardingTour onClose={() => setTourDismissedLocally(true)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-navy">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Primary action — the single highest-frequency task, unmistakably
          the most important thing on this screen. */}
      <Link
        to="/app/add-customer"
        className="mb-5 flex items-center gap-4 rounded-xl bg-teal p-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-150 hover:bg-teal-hover"
      >
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
          <UserPlusIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">Register a new customer</p>
          <p className="mt-0.5 text-sm text-white/80">Card ID and validity are generated automatically.</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 flex-shrink-0" />
      </Link>

      {/* Operational snapshot. */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryLoading || !summary ? (
          <>
            <SkeletonStatTile />
            <SkeletonStatTile />
            <SkeletonStatTile />
            <SkeletonStatTile />
          </>
        ) : (
          <>
            <StatTile label="Printed Today" value={summary.cards_printed_today} tone="teal" />
            <StatTile label="Registered Today" value={summary.customers_registered_today} />
            <StatTile label="Total Customers" value={summary.total_customers} />
            <StatTile label="Total Printed" value={summary.total_prints} />
          </>
        )}
      </div>

      {isBrandNew && (
        <div className="mb-5 rounded-xl border border-dashed border-teal/40 bg-teal-light/40 p-4">
          <p className="text-sm font-semibold text-navy">Getting started</p>
          <ul className="mt-2.5 space-y-1.5 text-sm text-ink/80">
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-line" />
              <span>Register your first customer</span>
            </li>
            <li className="flex items-center gap-2 text-muted">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-line" />
              <span>The admin team prints their card</span>
            </li>
          </ul>
        </div>
      )}

      {/* Secondary, common actions — deliberately lower visual weight than
          the primary CTA and the snapshot above. */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex flex-col gap-2 rounded-xl border border-line/70 bg-white p-3.5 transition-shadow duration-150 hover:shadow-md sm:p-4"
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-navy">Recently registered</p>
          <Link to="/app/customers" className="text-xs font-medium text-teal hover:underline">
            View all customers
          </Link>
        </div>

        <RecentActivity isLoading={recentLoading} customers={recentCustomers} />
      </div>
    </div>
  );
}
