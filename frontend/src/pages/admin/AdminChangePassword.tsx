import { changeAdminPassword } from "../../api/auth";
import { ChangePasswordForm } from "../../components/account/ChangePasswordForm";

export function AdminChangePasswordPage() {
  return <ChangePasswordForm onSubmit={changeAdminPassword} />;
}
