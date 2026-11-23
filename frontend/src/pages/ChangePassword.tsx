import { changePassword } from "../api/auth";
import { ChangePasswordForm } from "../components/account/ChangePasswordForm";

export function ChangePasswordPage() {
  return <ChangePasswordForm onSubmit={changePassword} />;
}
