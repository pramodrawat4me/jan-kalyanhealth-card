import { Link } from "react-router-dom";

import { AmbientBackdrop } from "../components/ui/AmbientBackdrop";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <AmbientBackdrop />
      <p className="text-3xl font-semibold text-navy">404</p>
      <p className="text-sm text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/login" className="text-sm font-medium text-teal hover:underline">
        Go to login
      </Link>
    </div>
  );
}
