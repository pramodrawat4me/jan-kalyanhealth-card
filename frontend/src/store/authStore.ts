import { create } from "zustand";

import type { AdminSummary, PartnerSummary } from "../api/types";

export type AuthScope = "partner" | "admin";

/** Non-sensitive hint only — which login flow to retry on app boot. The
 * actual credential (the access token) never touches persistent storage;
 * it lives in this in-memory store and is lost on refresh, which is exactly
 * why `restoreSession()` exists to silently re-derive it from the httpOnly
 * refresh cookie. */
const SCOPE_HINT_KEY = "janarogya:last-scope";

interface AuthState {
  accessToken: string | null;
  scope: AuthScope | null;
  partner: PartnerSummary | null;
  admin: AdminSummary | null;
  isBootstrapping: boolean;
  setPartnerSession: (accessToken: string, partner: PartnerSummary) => void;
  setAdminSession: (accessToken: string, admin: AdminSummary) => void;
  setAccessToken: (accessToken: string) => void;
  setBootstrapping: (value: boolean) => void;
  /** Patches the in-memory partner record without touching the session
   * token/scope — used after actions like completing onboarding where the
   * backend returns a fresh `PartnerOut` but nothing about auth changed. */
  updatePartner: (partner: PartnerSummary) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  scope: null,
  partner: null,
  admin: null,
  isBootstrapping: true,

  setPartnerSession: (accessToken, partner) => {
    localStorage.setItem(SCOPE_HINT_KEY, "partner");
    set({ accessToken, scope: "partner", partner, admin: null });
  },

  setAdminSession: (accessToken, admin) => {
    localStorage.setItem(SCOPE_HINT_KEY, "admin");
    set({ accessToken, scope: "admin", admin, partner: null });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setBootstrapping: (value) => set({ isBootstrapping: value }),

  updatePartner: (partner) => set({ partner }),

  clearSession: () => {
    localStorage.removeItem(SCOPE_HINT_KEY);
    set({ accessToken: null, scope: null, partner: null, admin: null });
  },
}));

export function getLastKnownScope(): AuthScope | null {
  const value = localStorage.getItem(SCOPE_HINT_KEY);
  return value === "partner" || value === "admin" ? value : null;
}
