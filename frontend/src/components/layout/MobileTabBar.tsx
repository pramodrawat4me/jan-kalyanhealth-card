import type { ReactElement } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/cn";
import { UserPlusIcon } from "../icons";
import { PARTNER_TAB_ITEMS } from "./navConfig";

/** Partner-only bottom tab bar. Four equal destinations plus a raised centre
 * action for Add Customer — establishing the hierarchy the audit called out
 * as missing ("Add Customer and Find Card may be significantly more
 * operationally important than Profile") without adding a 5th equal-weight
 * tab. Admin doesn't get a bottom bar: it has no single dominant action the
 * way Partner does, so mobile admin relies on the top bar + nav drawer. */
export function MobileTabBar() {
  const [leftItems, rightItems] = [PARTNER_TAB_ITEMS.slice(0, 2), PARTNER_TAB_ITEMS.slice(2)];

  return (
    <nav
      // See AppShell header comment — no `backdrop-blur` on a `fixed` bar
      // with scrolling content behind it; that per-frame resample was a
      // real cause of the mobile scroll/animation jank.
      className="fixed inset-x-0 bottom-0 z-30 bg-white/95 lg:hidden"
      style={{ boxShadow: "0 -24px 48px -36px rgba(9, 60, 113, 0.4)" }}
    >
      <div className="h-0.5 bg-gradient-to-r from-teal via-brand-green to-teal" aria-hidden="true" />
      <div className="relative mx-auto flex h-16 max-w-xl items-stretch">
        {leftItems.map((item) => (
          <TabLink key={item.to} to={item.to} end={item.end} label={item.label} icon={item.icon} />
        ))}

        {/* Spacer for the raised FAB, which is absolutely positioned so it
            visually breaks out of the bar without affecting flex sizing. */}
        <div className="flex-1" />

        {rightItems.map((item) => (
          <TabLink key={item.to} to={item.to} end={item.end} label={item.label} icon={item.icon} />
        ))}

        <NavLink
          to="/app/add-customer"
          aria-label="Add Customer"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-teal text-white shadow-elevated transition-transform duration-150 active:scale-95"
        >
          <UserPlusIcon className="h-6 w-6" />
        </NavLink>
      </div>
    </nav>
  );
}

function TabLink({
  to,
  end,
  label,
  icon: Icon,
}: Readonly<{ to: string; end?: boolean; label: string; icon: (props: { className?: string }) => ReactElement }>) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
          isActive ? "text-teal" : "text-muted",
        )
      }
    >
      <Icon className="h-[21px] w-[21px]" />
      {label}
    </NavLink>
  );
}
