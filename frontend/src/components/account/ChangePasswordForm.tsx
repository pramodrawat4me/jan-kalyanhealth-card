import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { extractErrorMessage, extractFieldErrors } from "../../api/client";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { PageHeader } from "../ui/PageHeader";
import { PasswordInput } from "../ui/PasswordInput";
import { toast } from "../../store/toastStore";

/** Shared by the partner and admin "Change Password" pages — identical form
 * and validation either way, just a different submit call, so the two
 * thin page wrappers don't duplicate this whole form. */
export function ChangePasswordForm({
  onSubmit,
}: Readonly<{ onSubmit: (newPassword: string, confirmPassword: string) => Promise<void> }>) {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(newPassword, confirmPassword);
      toast("success", "Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFormError(extractErrorMessage(error, "Could not update password."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Change Password"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="New Password" required error={errors.new_password} hint="Minimum 8 characters, at least one letter and one number">
          <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} invalid={Boolean(errors.new_password)} required />
        </FormField>

        <FormField label="Confirm Password" required error={errors.confirm_password}>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} invalid={Boolean(errors.confirm_password)} required />
        </FormField>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Update
        </Button>
      </form>
    </div>
  );
}
