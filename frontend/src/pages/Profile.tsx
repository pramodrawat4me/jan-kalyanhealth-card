import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { fetchCurrentPartner, logoutPartner } from "../api/auth";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { DetailRow } from "../components/ui/DetailRow";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import {
  CalendarIcon,
  ChevronRightIcon,
  IdCardIcon,
  MapPinIcon,
  PhoneIcon,
} from "../components/icons";
import { formatDisplayDate } from "../lib/date";
import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";

function locationLine(profile: { state_name: string | null; city_name: string | null; tahsil_name: string | null }): string {
  const parts = [profile.tahsil_name, profile.city_name, profile.state_name].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not set";
}

export function ProfilePage() {
  const partner = useAuthStore((state) => state.partner);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "me", "partner"],
    queryFn: fetchCurrentPartner,
    initialData: undefined,
  });

  async function handleLogout() {
    try {
      await logoutPartner();
    } catch {
      // Ignore — session is cleared locally regardless.
    }
    clearSession();
    toast("info", "You have been logged out.");
    navigate("/login", { replace: true });
  }

  const name = profile?.name ?? partner?.name ?? "";

  return (
    <div>
      <PageHeader title="Profile" />

      {/* Identity header — photo, name, partner ID, and account status up
          front, matching the weight a real account page gives its owner
          instead of a bare name + two rows. */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line/70 bg-white p-6 text-center">
        <Avatar src={profile?.photo_url ?? null} name={name || "?"} size="lg" />
        <div>
          <p className="text-lg font-semibold text-navy">{isLoading ? <Skeleton className="mx-auto h-5 w-32" /> : name}</p>
          <p className="mt-1 font-semibold text-card-id">
            {isLoading ? <Skeleton className="mx-auto mt-1 h-3.5 w-20" /> : `Partner ID: ${profile?.id ?? partner?.id ?? "-"}`}
          </p>
        </div>
        {!isLoading && (
          <Badge tone={profile?.is_active ?? partner?.is_active ? "success" : "danger"}>
            {profile?.is_active ?? partner?.is_active ? "Active Account" : "Deactivated"}
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-line/70 bg-white p-5">
        <p className="mb-1 text-sm font-semibold text-navy">Account Details</p>
        {isLoading || !profile ? (
          <div className="space-y-4 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <DetailRow icon={PhoneIcon} label="Mobile number" value={`+91 ${profile.mobile}`} />
            <DetailRow icon={IdCardIcon} label="Partner ID" value={profile.id} />
            <DetailRow icon={MapPinIcon} label="Service area" value={locationLine(profile)} />
            <DetailRow
              icon={CalendarIcon}
              label="Partner since"
              value={formatDisplayDate(profile.created_at.slice(0, 10))}
            />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/app/profile/change-password">
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
