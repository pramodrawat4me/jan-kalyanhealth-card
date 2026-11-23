import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { activatePartner, createPartner, deactivatePartner, deletePartner, listPartners } from "../../api/admin";
import { extractErrorMessage, extractFieldErrors } from "../../api/client";
import type { PartnerAdmin } from "../../api/types";
import { TrashIcon } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "../../components/ui/Table";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useCities, useStates, useTahsils } from "../../hooks/useLocations";
import { toast } from "../../store/toastStore";

const PAGE_SIZE = 20;

function CreatePartnerForm({ onCreated }: { onCreated: () => void }) {
  const { data: states } = useStates();
  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [tahsilId, setTahsilId] = useState("");
  const { data: cities } = useCities(stateId ? Number(stateId) : null);
  const { data: tahsils } = useTahsils(cityId ? Number(cityId) : null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    setIsSubmitting(true);

    try {
      await createPartner({
        name,
        mobile,
        password,
        state_id: Number(stateId),
        city_id: Number(cityId),
        tahsil_id: Number(tahsilId),
        photo,
      });
      toast("success", "Partner created successfully.");
      setPhoto(null);
      setName("");
      setMobile("");
      setPassword("");
      setStateId("");
      setCityId("");
      setTahsilId("");
      onCreated();
    } catch (error) {
      setFormError(extractErrorMessage(error, "Could not create partner."));
      setErrors(extractFieldErrors(error) ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <PhotoUpload value={photo} onChange={setPhoto} error={errors.photo} hint="Partner Photo (optional)" />
      </div>
      <FormField label="Full Name" required error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="Mobile Number" required error={errors.mobile}>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          required
        />
      </FormField>
      <FormField label="Temporary Password" required error={errors.password}>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
      </FormField>
      <div />
      <FormField label="Select State" required error={errors.state_id}>
        <Select
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setCityId("");
            setTahsilId("");
          }}
          required
        >
          <option value="">State</option>
          {states?.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Select City" required error={errors.city_id}>
        <Select
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            setTahsilId("");
          }}
          disabled={!stateId}
          required
        >
          <option value="">City</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Select Tahsil" required error={errors.tahsil_id}>
        <Select value={tahsilId} onChange={(e) => setTahsilId(e.target.value)} disabled={!cityId} required>
          <option value="">Tahsil</option>
          {tahsils?.map((tahsil) => (
            <option key={tahsil.id} value={tahsil.id}>
              {tahsil.name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="sm:col-span-2">
        {formError && <p className="mb-3 text-sm text-danger">{formError}</p>}
        <Button type="submit" isLoading={isSubmitting}>
          Create Partner
        </Button>
      </div>
    </form>
  );
}

export function AdminPartnersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PartnerAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "partners", page, search],
    queryFn: () => listPartners(page, PAGE_SIZE, search),
    placeholderData: (previous) => previous,
  });

  async function handleToggle(id: number, isActive: boolean) {
    try {
      if (isActive) {
        await deactivatePartner(id);
        toast("success", "Partner deactivated.");
      } else {
        await activatePartner(id);
        toast("success", "Partner activated.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deletePartner(pendingDelete.id);
      toast("success", "Partner deleted.");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not delete this partner."));
    } finally {
      setIsDeleting(false);
    }
  }

  const partners = data?.data ?? [];
  const totalPages = data?.meta?.total_pages ?? 1;
  const showInitialSpinner = isLoading && !data;

  return (
    <div>
      <PageHeader
        title="Partner Management"
        description="Create partner accounts and control platform access."
        action={<Button onClick={() => setShowForm((prev) => !prev)}>{showForm ? "Close" : "New Partner"}</Button>}
      />

      {showForm && (
        <div className="mb-6 rounded-xl border border-line/70 bg-white p-5">
          <CreatePartnerForm
            onCreated={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
            }}
          />
        </div>
      )}

      <Input
        placeholder="Search by name or mobile"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setPage(1);
        }}
        className="mb-4 max-w-sm"
      />

      {showInitialSpinner && (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      )}

      {!showInitialSpinner && partners.length === 0 && (
        <EmptyState
          title={search ? "No results found" : "No partners yet"}
          description={
            search
              ? "No partner matches that name or mobile number. Try a different search."
              : "Registered partners will show up here."
          }
        />
      )}

      {!showInitialSpinner && partners.length > 0 && (
        <div className={isFetching ? "opacity-60 transition-opacity duration-150" : ""}>
          <Table>
            <TableHead>
              <TableRow>
                <Th></Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>Customers</Th>
                <Th>Prints</Th>
                <Th>Status</Th>
                <Th></Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <Td>
                    <Avatar src={partner.photo_url} name={partner.name} />
                  </Td>
                  <Td>{partner.name}</Td>
                  <Td>{partner.mobile}</Td>
                  <Td>{partner.customer_count}</Td>
                  <Td>{partner.print_count}</Td>
                  <Td>
                    <Badge tone={partner.is_active ? "success" : "danger"}>
                      {partner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={partner.is_active ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleToggle(partner.id, partner.is_active)}
                      >
                        {partner.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(partner)}
                        aria-label={`Delete ${partner.name}`}
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
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        title="Delete this partner?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.mobile}) will be permanently removed, along with any previously deleted customer records and print history. This can't be undone. Partners with active customers can't be deleted — remove their customers first, or deactivate them instead.`
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
