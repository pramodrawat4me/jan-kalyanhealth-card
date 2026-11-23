import { NavLink } from "react-router-dom";

import { cn } from "../../lib/cn";
import { LogOutIcon } from "../icons";
import { Logo } from "../ui/Logo";
import type { NavItem } from "./navConfig";

interface SidebarProps {
  roleLabel: string;
  primaryItems: NavItem[];
  secondaryItems?: NavItem[];
  identityName: string;
  identitySub: string;
  onLogout: () => void;
}

function NavRow({ item }: Readonly<{ item: NavItem }>) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
          isActive ? "bg-teal-light text-teal" : "text-ink/75 hover:bg-surface hover:text-ink",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-teal" aria-hidden="true" />
          )}
          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Desktop (lg+) app navigation — a translucent, lightly frosted panel
 * (see "modern depth / glass-like language" direction: subtle, not a full
 * glassmorphism treatment) fixed for the lifetime of the authenticated
 * session, replacing the mobile-shell-stretched-to-desktop pattern the
 * audit flagged on the partner side and the "vanishes below `sm`" gap on
 * the admin side. */
export function Sidebar({ roleLabel, primaryItems, secondaryItems, identityName, identitySub, onLogout }: Readonly<SidebarProps>) {
  return (
    <aside
      className="hidden lg:relative lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:bg-white/55 lg:backdrop-blur-2xl"
      style={{ boxShadow: "24px 0 60px -32px rgba(9, 60, 113, 0.45)" }}
    >
      {/* A blurred, softly-fading wash instead of a hard `border-r` — the
          panel dissolves into the ambient backdrop rather than being ruled
          off with a crisp partition line. */}
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-teal via-brand-green to-teal" aria-hidden="true" />
      <div className="flex items-center gap-3 px-5 pb-5 pt-5">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-light to-brand-green-light shadow-sm">
          <Logo variant="icon" size={26} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy">Jan Kalyan Health Card</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {primaryItems.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}

        {secondaryItems && secondaryItems.length > 0 && (
          <>
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-line/70 to-transparent" aria-hidden="true" />
            {secondaryItems.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      <div className="relative p-4">
        <div
          className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-line/70 to-transparent"
          aria-hidden="true"
        />
        <p className="truncate text-sm font-medium text-ink">{identityName}</p>
        <p className="truncate text-xs text-muted">{identitySub}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/10"
        >
          <LogOutIcon className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
