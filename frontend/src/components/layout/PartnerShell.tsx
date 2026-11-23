import { useNavigate } from "react-router-dom";

import { logoutPartner } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";
import { AppShell } from "./AppShell";
import { PARTNER_ACCOUNT_ITEMS, PARTNER_NAV_ITEMS } from "./navConfig";

/** Thin role-config wrapper around the shared `AppShell` — see AppShell for
 * the actual layout/navigation implementation. */
export function PartnerShell() {
  const partner = useAuthStore((state) => state.partner);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutPartner();
    } catch {
      // Clear the local session regardless — the cookie will expire anyway.
    }
    clearSession();
    toast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  }

  return (
    <AppShell
      role="partner"
      roleLabel="Partner Portal"
      primaryItems={PARTNER_NAV_ITEMS}
      secondaryItems={PARTNER_ACCOUNT_ITEMS}
      identityName={partner?.name ?? ""}
      identitySub={partner ? `+91 ${partner.mobile}` : ""}
      onLogout={handleLogout}
    />
  );
}
