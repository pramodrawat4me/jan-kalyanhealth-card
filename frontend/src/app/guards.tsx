import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { Spinner } from "../components/ui/Spinner";
import { useAuthStore } from "../store/authStore";

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

export function RequirePartner() {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const scope = useAuthStore((state) => state.scope);

  if (isBootstrapping) return <FullScreenSpinner />;
  if (scope !== "partner") return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const scope = useAuthStore((state) => state.scope);

  if (isBootstrapping) return <FullScreenSpinner />;
  if (scope !== "admin") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

/** Keeps an already-authenticated user off the login screens. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const scope = useAuthStore((state) => state.scope);

  if (isBootstrapping) return <FullScreenSpinner />;
  if (scope === "partner") return <Navigate to="/app" replace />;
  if (scope === "admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
