import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { createHospital, deleteHospital, listHospitalsAdmin, toggleHospital } from "../../api/admin";
import { extractErrorMessage, extractFieldErrors } from "../../api/client";
import type { Hospital } from "../../api/types";
import { TrashIcon } from "../../components/icons";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useCities, useStates } from "../../hooks/useLocations";
import { toast } from "../../store/toastStore";

const PAGE_SIZE = 20;

function CreateHospitalForm({ onCreated }: { onCreated: () => void }) {
  const { data: states } = useStates();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [discountDetails, setDiscountDetails] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const { data: cities } = useCities(stateId ? Number(stateId) : null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);

    try {
      await createHospital({
        name,
        address: address || undefined,
        phone: phone || undefined,
        discount_details: discountDetails || undefined,
        state_id: stateId ? Number(stateId) : undefined,
        city_id: cityId ? Number(cityId) : undefined,
      });
      toast("success", "Hospital added successfully.");
      setName("");
      setAddress("");
      setPhone("");
      setDiscountDetails("");
      setStateId("");
      setCityId("");
      onCreated();
    } catch (error) {
      setFormError(extractErrorMessage(error, "Could not add hospital."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Hospital Name" required error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="Phone" error={errors.phone}>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <FormField label="State" error={errors.state_id}>
        <Select
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setCityId("");
          }}
        >
          <option value="">State</option>
          {states?.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="City" error={errors.city_id}>
        <Select value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!stateId}>
          <option value="">City</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Address" className="sm:col-span-2" error={errors.address}>
        <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <FormField label="Discount Details" className="sm:col-span-2" error={errors.discount_details}>
        <Textarea value={discountDetails} onChange={(e) => setDiscountDetails(e.target.value)} />
      </FormField>

      <div className="sm:col-span-2">
        {formError && <p className="mb-3 text-sm text-danger">{formError}</p>}
        <Button type="submit" isLoading={isSubmitting}>
          Add Hospital
        </Button>
      </div>
    </form>
  );
}

export function AdminHospitalsPage() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Hospital | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "hospitals", page],
    queryFn: () => listHospitalsAdmin(page, PAGE_SIZE),
  });

  async function handleToggle(id: number) {
    try {
      await toggleHospital(id);
      toast("success", "Hospital status updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "hospitals"] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteHospital(pendingDelete.id);
      toast("success", "Hospital deleted.");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "hospitals"] });
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not delete this hospital."));
    } finally {
      setIsDeleting(false);
    }
  }

  const hospitals = data?.data ?? [];
  const totalPages = data?.meta?.total_pages ?? 1;

  return (
    <div>
      <PageHeader
        title="Hospital Management"
        description="Add and maintain the empanelled hospital directory."
        action={<Button onClick={() => setShowForm((prev) => !prev)}>{showForm ? "Close" : "New Hospital"}</Button>}
      />

      {showForm && (
        <div className="mb-6 rounded-xl border border-line/70 bg-white p-5">
          <CreateHospitalForm
            onCreated={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["admin", "hospitals"] });
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th></Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {hospitals.map((hospital) => (
                <TableRow key={hospital.id}>
                  <Td>
                    <p className="font-medium">{hospital.name}</p>
                    {hospital.address && <p className="text-xs text-muted">{hospital.address}</p>}
                  </Td>
                  <Td>{hospital.phone ?? "-"}</Td>
                  <Td>
                    <Badge tone={hospital.is_active ? "success" : "danger"}>
                      {hospital.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hospital.is_active ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleToggle(hospital.id)}
                      >
                        {hospital.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(hospital)}
                        aria-label={`Delete ${hospital.name}`}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                      >
                        <TrashIcon className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog
        open={pendingDelete !== null}
        title="Delete this hospital?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be permanently removed from the empanelled directory. This can't be undone. To delist it temporarily, use Deactivate instead.`
            : undefined
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
