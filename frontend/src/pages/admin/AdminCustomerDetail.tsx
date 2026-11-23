import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { adminDeleteCustomer, adminGetCustomer, adminGetCustomerActivity } from "../../api/admin";
import { extractErrorMessage } from "../../api/client";
import { CardPreview } from "../../components/card/CardPreview";
import { PrinterIcon, TrashIcon } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { PrintBadge } from "../../components/ui/PrintBadge";
import { Spinner } from "../../components/ui/Spinner";
import { ValidityBadge } from "../../components/ui/ValidityBadge";
import { useAdminPrintCard } from "../../hooks/useAdminPrintCard";
import { formatDisplayDate, formatDisplayDateTime } from "../../lib/date";
import { toast } from "../../store/toastStore";

function ProfileField({ label, value, emphasize }: Readonly<{ label: string; value: string; emphasize?: boolean }>) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={emphasize ? "font-semibold text-card-id" : "text-sm text-ink"}>{value}</p>
    </div>
  );
}

function ActivityLog({ customerId }: Readonly<{ customerId: number }>) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customer-activity", customerId],
    queryFn: () => adminGetCustomerActivity(customerId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size={20} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Never printed" description="This card hasn't been generated yet." />;
  }

  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {data.map((entry, index) => (
        <li key={`${entry.printed_at}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-light text-teal">
              <PrinterIcon className="h-[15px] w-[15px]" />
            </span>
            <p className="text-sm text-ink">
              Printed by <span className="font-medium text-navy">{entry.printed_by}</span>
            </p>
          </div>
          <p className="flex-shrink-0 text-xs text-muted">{formatDisplayDateTime(entry.printed_at)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Admin-only surface for the printable card: full profile, live front/back
 * preview, the print/download action, and every print event this card has
 * ever had. Partners get the read-only profile version (`CustomerDetail`)
 * with none of this — printing is admin-exclusive by design. */
export function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = Number(customerId);
  const { print, isPrinting } = useAdminPrintCard();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => adminGetCustomer(id),
    enabled: Boolean(customerId),
  });

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await adminDeleteCustomer(id);
      toast("success", "Customer deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      navigate("/admin/customers");
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not delete this customer."));
      setIsDeleting(false);
    }
  }

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
        title="Customer Detail"
        description="Full record, printable card, and print activity."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <TrashIcon className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-line/70 bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={customer.photo_url} name={customer.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-navy">
              {customer.name}, {customer.age}
            </p>
            <p className="truncate text-sm text-muted">{customer.father_husband}</p>
          </div>
          <Badge tone="teal">{customer.partner_name}</Badge>
          <ValidityBadge validityDate={customer.validity_date} />
          <PrintBadge lastPrintedAt={customer.last_printed_at} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line/60 pt-5 sm:grid-cols-3">
          <ProfileField label="Card ID" value={customer.card_id} emphasize />
          <ProfileField label="Mobile" value={customer.mobile} />
          <ProfileField label="Aadhaar (masked)" value={`XXXX-XXXX-${customer.aadhaar_last4}`} />
          <ProfileField label="Gender / Age" value={`${customer.gender}, ${customer.age}`} />
          <ProfileField label="Entry Date" value={formatDisplayDate(customer.entry_date)} />
          <ProfileField label="Validity Date" value={formatDisplayDate(customer.validity_date)} />
          <ProfileField label="Address" value={customer.address} />
          <ProfileField label="Registering Partner" value={customer.partner_name} />
        </div>
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-navy">Card Preview</h2>
      </div>

      <CardPreview
        cardId={customer.card_id}
        name={customer.name}
        fatherHusband={customer.father_husband}
        dob={customer.dob}
        gender={customer.gender}
        address={customer.address}
        cityName={customer.city_name}
        validityDate={customer.validity_date}
        mobile={customer.mobile}
        photoUrl={customer.photo_url}
      />

      <Button
        className="mt-5"
        fullWidth
        size="lg"
        isLoading={isPrinting(customer.id)}
        onClick={() => print(customer.id, customer.name, customer.card_id)}
      >
        Print / Download Card PDF
      </Button>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-navy">Print Activity</h2>
        <ActivityLog customerId={customer.id} />
      </div>

      <Dialog
        open={isConfirmingDelete}
        title="Delete this customer?"
        description={`${customer.name}'s record (${customer.card_id}) will be removed. This can't be undone from here.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setIsConfirmingDelete(false)}
      />
    </div>
  );
}
