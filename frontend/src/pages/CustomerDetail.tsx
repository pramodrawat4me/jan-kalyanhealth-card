import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { getCustomer } from "../api/customers";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { PrintBadge } from "../components/ui/PrintBadge";
import { Spinner } from "../components/ui/Spinner";
import { ValidityBadge } from "../components/ui/ValidityBadge";
import { InfoIcon } from "../components/icons";
import { useCities } from "../hooks/useLocations";
import { formatDisplayDate } from "../lib/date";
import { useAuthStore } from "../store/authStore";

function ProfileField({ label, value, emphasize }: Readonly<{ label: string; value: string; emphasize?: boolean }>) {
  return (
    <div>
      <p className="font-devanagari text-xs text-muted">{label}</p>
      <p className={emphasize ? "font-semibold text-card-id" : "text-sm text-ink"}>{value}</p>
    </div>
  );
}

/** Partner-facing customer view — profile only. Printing and the actual
 * printable card artifact are admin-only (see AdminCustomerDetail); a
 * partner can see everything about their customer's record here, but
 * never generate or download the card PDF itself. */
export function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const partner = useAuthStore((state) => state.partner);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(Number(customerId)),
    enabled: Boolean(customerId),
  });

  const { data: cities } = useCities(partner?.state_id);
  const cityName = cities?.find((c) => c.id === customer?.city_id)?.name;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-sm text-muted">Customer not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Customer Profile"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/app/customers/${customer.id}/edit`)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-line/70 bg-white p-5">
        <div className="flex items-center gap-4">
          <Avatar src={customer.photo_url} name={customer.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-devanagari text-base font-semibold text-navy">
              {customer.name}, {customer.age}
            </p>
            <p className="truncate font-devanagari text-sm text-muted">पिता/पति: {customer.father_husband}</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
            <ValidityBadge validityDate={customer.validity_date} />
            <PrintBadge lastPrintedAt={customer.last_printed_at} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line/60 pt-5 sm:grid-cols-2">
          <ProfileField label="आई.डि. (Card ID)" value={customer.card_id} emphasize />
          <ProfileField label="मोब नं (Mobile)" value={customer.mobile} />
          <ProfileField label="लिंग / आयु (Gender / Age)" value={`${customer.gender}, ${customer.age}`} />
          <ProfileField label="आधार (Aadhaar, masked)" value={`XXXX-XXXX-${customer.aadhaar_last4}`} />
          <ProfileField label="प्रवेश तिथि (Entry Date)" value={formatDisplayDate(customer.entry_date)} />
          <ProfileField label="वैधता तिथि (Validity Date)" value={formatDisplayDate(customer.validity_date)} />
          <ProfileField
            label="पता (Address)"
            value={cityName ? `${customer.address}, ${cityName}` : customer.address}
          />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-3">
        <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
        <p className="text-xs text-muted">
          {customer.last_printed_at ? (
            <>
              Card printing is managed by the admin team. This card has been printed — check your Printing tab for
              the full history.
            </>
          ) : (
            <>Card printing is managed by the admin team. This card hasn't been printed yet.</>
          )}
        </p>
      </div>
    </div>
  );
}
