import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";

import { cn } from "../../lib/cn";
import { CloseIcon, LogOutIcon } from "../icons";
import { Logo } from "../ui/Logo";
import type { NavItem } from "./navConfig";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  roleLabel: string;
  primaryItems: NavItem[];
  secondaryItems?: NavItem[];
  identityName: string;
  identitySub: string;
  onLogout: () => void;
}

/** Mobile (< lg) full nav list, reached via the top bar's hamburger button.
 * This is the admin app's actual fix for the audit's top finding — sidebar
 * nav used to disappear below `sm` with nothing replacing it. Partner gets
 * the same drawer for the items that don't fit the 4-tab bottom bar
 * (Find Card, Hospitals, Support). */
export function NavDrawer({
  open,
  onClose,
  roleLabel,
  primaryItems,
  secondaryItems,
  identityName,
  identitySub,
  onLogout,
}: Readonly<NavDrawerProps>) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="animate-overlay-in absolute inset-0 cursor-pointer bg-navy/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-elevated">
        <div className="h-1 flex-shrink-0 bg-gradient-to-r from-teal via-brand-green to-teal" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-4 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-light to-brand-green-light">
              <Logo variant="icon" size={22} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" onClick={onClose}>
          {primaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive ? "bg-teal-light text-teal" : "text-ink/80 hover:bg-surface",
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}

          {secondaryItems && secondaryItems.length > 0 && (
            <>
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-line/70 to-transparent" aria-hidden="true" />
              {secondaryItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      isActive ? "bg-teal-light text-teal" : "text-ink/80 hover:bg-surface",
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </NavLink>
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
      </div>
    </div>,
    document.body,
  );
}
