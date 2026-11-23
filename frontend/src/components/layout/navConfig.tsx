import type { ReactElement } from "react";

import {
  Building2Icon,
  FileTextIcon,
  HeadsetIcon,
  HomeIcon,
  HospitalIcon,
  MapPinIcon,
  PrinterIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  /** Route match is exact (`end`) unless the item is itself a section root
   * with nested detail routes beneath it. */
  end?: boolean;
  icon: (props: Readonly<{ className?: string }>) => ReactElement;
}

/** Full nav surface for the partner sidebar (desktop) and drawer (mobile) —
 * every real workflow gets a first-class entry instead of being reachable
 * only through Dashboard tiles, which was the #1 finding of the partner
 * audit ("split navigation: bottom nav vs tile nav"). */
export const PARTNER_NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard", end: true, icon: HomeIcon },
  { to: "/app/customers", label: "Customers", icon: UsersIcon },
  { to: "/app/add-customer", label: "Add Customer", icon: UserPlusIcon },
  { to: "/app/find-card", label: "Find Card", icon: SearchIcon },
  { to: "/app/printing", label: "Printing", icon: PrinterIcon },
  { to: "/app/hospitals", label: "Hospitals", icon: HospitalIcon },
];

export const PARTNER_ACCOUNT_ITEMS: NavItem[] = [
  { to: "/app/support", label: "Support", icon: HeadsetIcon },
  { to: "/app/profile", label: "Profile", icon: UsersIcon },
];

/** Curated to the 4 highest-frequency destinations for the mobile tab bar —
 * "Add Customer" is promoted out of this row into a raised centre action
 * (see MobileTabBar) rather than competing as a 5th equal-weight tab. */
export const PARTNER_TAB_ITEMS: NavItem[] = [
  { to: "/app", label: "Home", end: true, icon: HomeIcon },
  { to: "/app/customers", label: "Customers", icon: UsersIcon },
  { to: "/app/printing", label: "Printing", icon: PrinterIcon },
  { to: "/app/profile", label: "Profile", icon: UsersIcon },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", end: true, icon: HomeIcon },
  { to: "/admin/partners", label: "Partners", icon: Building2Icon },
  { to: "/admin/customers", label: "Customers", icon: UsersIcon },
  { to: "/admin/hospitals", label: "Hospitals", icon: HospitalIcon },
  { to: "/admin/locations", label: "Locations", icon: MapPinIcon },
  { to: "/admin/reports", label: "Printing Reports", icon: FileTextIcon },
];

export const ADMIN_SETTINGS_ITEMS: NavItem[] = [
  { to: "/admin/card-settings", label: "Card Settings", icon: SettingsIcon },
  { to: "/admin/profile", label: "Profile", icon: UsersIcon },
];

export const ADMIN_BADGE_ICON = ShieldCheckIcon;
