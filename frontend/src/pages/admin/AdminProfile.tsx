import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { fetchCurrentAdmin, logoutAdmin, uploadAdminPhoto } from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import { ADMIN_BADGE_ICON } from "../../components/layout/navConfig";
import { CalendarIcon, ChevronRightIcon, IdCardIcon, PhoneIcon } from "../../components/icons";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DetailRow } from "../../components/ui/DetailRow";
import { PageHeader } from "../../components/ui/PageHeader";
import { EditablePhoto } from "../../components/ui/EditablePhoto";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDisplayDate } from "../../lib/date";
import { useAuthStore } from "../../store/authStore";
import { toast } from "../../store/toastStore";

export function AdminProfilePage() {
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "me", "admin"],
    queryFn: fetchCurrentAdmin,
  });

  const photoMutation = useMutation({
    mutationFn: uploadAdminPhoto,
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me", "admin"], updated);
      toast("success", "Profile photo updated.");
    },
    onError: (error) => {
      toast("error", extractErrorMessage(error, "Could not update your photo."));
    },
  });

  async function handleLogout() {
    try {
      await logoutAdmin();
    } catch {
      // Ignore — session is cleared locally regardless.
    }
    clearSession();
    toast("info", "You have been logged out.");
    navigate("/admin/login", { replace: true });
  }

  const name = profile?.name ?? admin?.name ?? "";

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="flex flex-col items-center gap-3 rounded-xl border border-line/70 bg-white p-6 text-center">
        <EditablePhoto
          src={profile?.photo_url ?? null}
          name={name || "?"}
          isUploading={photoMutation.isPending}
          onSelect={(file) => photoMutation.mutate(file)}
        />
        <div>
          <p className="text-lg font-semibold text-navy">{isLoading ? <Skeleton className="mx-auto h-5 w-32" /> : name}</p>
          <p className="mt-1 font-semibold text-card-id">
            {isLoading ? <Skeleton className="mx-auto mt-1 h-3.5 w-20" /> : `Admin ID: ${profile?.id ?? admin?.id ?? "-"}`}
          </p>
        </div>
        {!isLoading && (
          <Badge tone="teal">
            <span className="inline-flex items-center gap-1">
              <ADMIN_BADGE_ICON className="h-3.5 w-3.5" />
              Super Admin
            </span>
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line/70 bg-white p-5">
        <p className="mb-1 text-sm font-semibold text-navy">Account Details</p>
        {isLoading || !profile ? (
          <div className="space-y-4 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <DetailRow icon={PhoneIcon} label="Mobile number" value={`+91 ${profile.mobile}`} />
            <DetailRow icon={IdCardIcon} label="Admin ID" value={profile.id} />
            <DetailRow
              icon={CalendarIcon}
              label="Admin since"
              value={formatDisplayDate(profile.created_at.slice(0, 10))}
            />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/admin/profile/change-password">
          <Button fullWidth size="lg" className="justify-between px-5">
            Change Password
            <ChevronRightIcon className="h-[18px] w-[18px]" />
          </Button>
        </Link>
        <Button variant="danger" fullWidth size="lg" className="justify-between px-5" onClick={handleLogout}>
          Logout
          <ChevronRightIcon className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </div>
  );
}
