import { useEffect } from "react";

import { fetchCurrentAdmin, fetchCurrentPartner } from "../api/auth";
import { apiClient } from "../api/client";
import { getLastKnownScope, useAuthStore } from "../store/authStore";

/** Runs once on app load. The access token lives only in memory, so a full
 * page reload always starts with none — this silently exchanges the
 * httpOnly refresh cookie (if any) for a new access token and restores
 * the partner/admin identity, so the user isn't bounced to the login
 * screen on every refresh. */
export function useSessionBootstrap(): void {
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setPartnerSession = useAuthStore((state) => state.setPartnerSession);
  const setAdminSession = useAuthStore((state) => state.setAdminSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const scope = getLastKnownScope();
    if (!scope) {
      setBootstrapping(false);
      return;
    }

    const refreshPath = scope === "admin" ? "/admin/auth/refresh" : "/auth/refresh";

    apiClient
      .post(refreshPath)
      .then(async (response) => {
        const accessToken: string = response.data.data.access_token;
        setAccessToken(accessToken);

        if (scope === "admin") {
          const admin = await fetchCurrentAdmin();
          setAdminSession(accessToken, admin);
        } else {
          const partner = await fetchCurrentPartner();
          setPartnerSession(accessToken, partner);
        }
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        setBootstrapping(false);
      });
    // Intentionally runs only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
