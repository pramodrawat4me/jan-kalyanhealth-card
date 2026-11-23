import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { printingHistory, todaysPrintedCards } from "../api/cards";
import type { PrintLogItem } from "../api/types";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonListRows } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";
import { ChevronRightIcon, PrinterIcon } from "../components/icons";

const PAGE_SIZE = 20;

function formatPrintedAt(value: string, includeDate: boolean): string {
  const date = new Date(value);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (!includeDate) return time;
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${time}`;
}

function PrintLogRow({ item, showDate }: Readonly<{ item: PrintLogItem; showDate: boolean }>) {
  return (
    <li>
      <Link
        to={`/app/customers/${item.customer_id}`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface/60"
      >
        <Avatar src={item.photo_url} name={item.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-devanagari text-sm text-navy">
            नाम: {item.name}, {item.age}
          </p>
          <p className="truncate font-devanagari text-xs text-muted">पिता/पति: {item.father_husband}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-semibold text-card-id">{item.card_id}</p>
          <p className="mt-0.5 text-[11px] text-muted">{formatPrintedAt(item.printed_at, showDate)}</p>
        </div>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-line" />
      </Link>
    </li>
  );
}

function TodayTab() {
  const { data, isLoading } = useQuery({ queryKey: ["cards", "today"], queryFn: todaysPrintedCards });

  if (isLoading) return <SkeletonListRows count={4} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Nothing printed yet today"
        description="Cards you print today will show up here as they happen."
        action={
          <Link
            to="/app/add-customer"
            className="text-sm font-medium text-teal transition-colors duration-150 hover:text-teal-hover"
          >
            Register a customer →
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {data.map((item) => (
        <PrintLogRow key={`${item.customer_id}-${item.printed_at}`} item={item} showDate={false} />
      ))}
    </ul>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["cards", "printings", page],
    queryFn: () => printingHistory(page, PAGE_SIZE),
  });

  const items = data?.data ?? [];
  const totalPages = data?.meta?.total_pages ?? 1;

  if (isLoading) return <SkeletonListRows count={6} />;

  if (items.length === 0) {
    return <EmptyState title="No printing history yet" description="Every card you print, ever, will be listed here." />;
  }

  return (
    <>
      <ul className={`divide-y divide-line/60 rounded-xl border border-line/70 bg-white transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}>
        {items.map((item, index) => (
          <PrintLogRow key={`${item.customer_id}-${item.printed_at}-${index}`} item={item} showDate />
        ))}
      </ul>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

/** Merged "Today's Card" + "Total Printing" — the audit found these were
 * near-duplicate list screens with only the data source differing. One page
 * with purpose-driven tabs makes the relationship (Today is a filtered view
 * of History) legible instead of two separately-navigated clones. */
export function PrintingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "history" ? "history" : "today";
  const [tab, setTab] = useState<"today" | "history">(initialTab);

  function handleTabChange(next: string) {
    setTab(next as "today" | "history");
    setSearchParams(next === "history" ? { tab: "history" } : {}, { replace: true });
  }

  return (
    <div>
      <PageHeader
        title="Printing"
        description="Cards are printed by the admin team. This is a live record of when your customers' cards were printed."
        action={
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light text-teal">
            <PrinterIcon className="h-[18px] w-[18px]" />
          </span>
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={handleTabChange}
        options={[
          { value: "today", label: "Today" },
          { value: "history", label: "History" },
        ]}
      />

      {tab === "today" ? <TodayTab /> : <HistoryTab />}
    </div>
  );
}