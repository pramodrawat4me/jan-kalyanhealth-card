import { LoginPage } from "./Login";

/** `/admin/login` renders the exact same landing + sign-in experience as
 * `/login`, just pre-selected to the Admin tab — see `Login.tsx` for the
 * shared implementation and why the portal switcher lives there. */
export function AdminLoginPage() {
  return <LoginPage initialPortal="admin" />;
}
