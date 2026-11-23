import { type ReactNode, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { cn } from "../../lib/cn";
import { ArrowLeftIcon, MenuIcon, PlusIcon } from "../icons";
import { AmbientBackdrop } from "../ui/AmbientBackdrop";
import { Logo } from "../ui/Logo";
import { MobileTabBar } from "./MobileTabBar";
import { NavDrawer } from "./NavDrawer";
import { Sidebar } from "./Sidebar";
import type { NavItem } from "./navConfig";

interface AppShellProps {
  role: "partner" | "admin";
  roleLabel: string;
  primaryItems: NavItem[];
  secondaryItems?: NavItem[];
  identityName: string;
  identitySub: string;
  onLogout: () => void;
}

function useActiveSectionLabel(items: NavItem[], secondaryItems: NavItem[] = []): string {
  const { pathname } = useLocation();
  const all = [...items, ...secondaryItems];
  const exact = all.find((item) => item.end && pathname === item.to);
  if (exact) return exact.label;
  const prefixed = all
    .filter((item) => !item.end && pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return prefixed?.label ?? "";
}

/** One adaptive shell for both Partner and Admin: a persistent sidebar with
 * a slim contextual top bar on desktop (lg+), and a top bar + bottom tab
 * bar (partner only) + slide-over nav drawer on mobile/tablet. Replaces the
 * previous PartnerShell (mobile chrome stretched onto desktop) and
 * AdminShell (sidebar that vanished below `sm` with nothing replacing it) —
 * see the Partner/Admin audits for why those were the top structural
 * findings driving this component. */
export function AppShell({
  role,
  roleLabel,
  primaryItems,
  secondaryItems,
  identityName,
  identitySub,
  onLogout,
}: Readonly<AppShellProps>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sectionLabel = useActiveSectionLabel(primaryItems, secondaryItems);

  // Close the drawer automatically on route change instead of relying only
  // on the nav links' own onClick — covers back/forward navigation too.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const isPartner = role === "partner";
  const onAddCustomerPage = location.pathname.startsWith("/app/add-customer");
  const showComposeShortcut = isPartner && !onAddCustomerPage;

  return (
    <div className="relative flex min-h-screen">
      <AmbientBackdrop />
      <Sidebar
        roleLabel={roleLabel}
        primaryItems={primaryItems}
        secondaryItems={secondaryItems}
        identityName={identityName}
        identitySub={identitySub}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: on mobile it's the primary way to reach navigation
            (hamburger) and to know where you are; on desktop the sidebar
            already covers navigation/identity, so this row shrinks to a
            contextual label plus a couple of high-value shortcuts. */}
        <header
          // No `backdrop-blur` here on purpose — this is `sticky`, so page
          // content scrolls directly underneath it. A `backdrop-filter` on
          // a sticky/fixed element has to re-sample everything behind it
          // on every scroll frame, which is exactly what was making
          // scrolling and the hamburger-drawer animation feel stuck on
          // mobile. A near-opaque gradient looks just as intentional
          // without that per-frame cost.
          className="sticky top-0 z-20 flex h-14 flex-shrink-0 items-center gap-3 bg-gradient-to-r from-white/95 via-white/92 to-teal-light/70 px-4 lg:h-16 lg:px-8"
          style={{ boxShadow: "0 24px 48px -36px rgba(9, 60, 113, 0.45)" }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-surface lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-light to-brand-green-light">
              <Logo variant="icon" size={18} />
            </span>
            <p className="truncate text-sm font-semibold text-navy">{sectionLabel || roleLabel}</p>
          </div>

          <p className="hidden truncate text-sm font-semibold text-navy lg:block">{sectionLabel}</p>

          <div className="ml-auto flex items-center gap-2">
            {showComposeShortcut && (
              <button
                type="button"
                onClick={() => navigate("/app/add-customer")}
                className="hidden items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-hover lg:flex"
              >
                <PlusIcon className="h-4 w-4" />
                New Customer
              </button>
            )}
          </div>
        </header>

        <main className={cn("flex-1 px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7", isPartner && "pb-24 lg:pb-10")}>
          {/* Keyed on the route so every page navigation replays the
              entrance instead of only firing once on shell mount — this is
              the one place that guarantees every screen in the app (partner
              and admin alike) gets the same smooth settle-in motion without
              having to add it page-by-page. */}
          <div key={location.pathname} className="animate-fade-up mx-auto w-full max-w-[100rem]">
            <Outlet />
          </div>
        </main>
      </div>

      {isPartner && <MobileTabBar />}

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        roleLabel={roleLabel}
        primaryItems={primaryItems}
        secondaryItems={secondaryItems}
        identityName={identityName}
        identitySub={identitySub}
        onLogout={onLogout}
      />
    </div>
  );
}

/** Back-link row for detail/sub-pages — pairs with the top bar's section
 * label so a page two levels deep (e.g. Customer Detail, Change Password)
 * still reads as "where am I / how do I get back" without a full
 * breadcrumb trail, which the shallow route tree here doesn't need. */
export function BackLink({ to, children }: Readonly<{ to: string; children: ReactNode }>) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:text-teal"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {children}
    </Link>
  );
}
