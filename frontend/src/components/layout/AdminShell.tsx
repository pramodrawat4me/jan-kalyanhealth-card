import { useNavigate } from "react-router-dom";

import { logoutAdmin } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";
import { AppShell } from "./AppShell";
import { ADMIN_NAV_ITEMS, ADMIN_SETTINGS_ITEMS } from "./navConfig";

/** Thin role-config wrapper around the shared `AppShell` — see AppShell for
 * the actual layout/navigation implementation. */
export function AdminShell() {
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutAdmin();
    } catch {
      // Ignore — session is being cleared locally regardless.
    }
    clearSession();
    toast("info", "You have been logged out.");
    navigate("/admin/login", { replace: true });
  }

  return (
    <AppShell
      role="admin"
      roleLabel="Admin Portal"
      primaryItems={ADMIN_NAV_ITEMS}
      secondaryItems={ADMIN_SETTINGS_ITEMS}
      identityName={admin?.name ?? ""}
      identitySub={admin ? `+91 ${admin.mobile}` : ""}
      onLogout={handleLogout}
    />
  );
}
