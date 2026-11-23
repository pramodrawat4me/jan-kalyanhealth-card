import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { deleteCustomer, listCustomers } from "../api/customers";
import { extractErrorMessage } from "../api/client";
import type { CustomerListItem } from "../api/types";
import { AlertTriangleIcon, ChevronRightIcon, SearchIcon, TrashIcon, UserPlusIcon } from "../components/icons";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { PrintBadge } from "../components/ui/PrintBadge";
import { SkeletonListRows, SkeletonTableRows } from "../components/ui/Skeleton";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "../components/ui/Table";
import { ValidityBadge } from "../components/ui/ValidityBadge";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { toast } from "../store/toastStore";

const PAGE_SIZE = 20;

/** No print action here — printing is admin-only. Partners can view a
 * customer's profile and delete a record, but the card itself is only
 * generated from the admin Customer Detail page. */
function CustomerRowActions({ onDelete }: Readonly<{ onDelete: (event: MouseEvent) => void }>) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete customer"
        title="Delete customer"
        className="flex h-8 w-8 items-center justify-center rounded-full text-danger transition-colors duration-150 hover:bg-danger/10"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Desktop presentation — a real operational table: search, sortable-feeling
 * columns, per-row status and actions. The audit found Customers rendering
 * the same single-column phone list at every viewport; this is the desktop
 * table that pattern was missing. */
function CustomersTable({
  customers,
  onDelete,
}: Readonly<{ customers: CustomerListItem[]; onDelete: (c: CustomerListItem) => void }>) {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHead>
        <tr>
          <Th>Customer</Th>
          <Th>Mobile</Th>
          <Th>Card ID</Th>
          <Th>Status</Th>
          <Th>Printed</Th>
          <Th className="text-right">Actions</Th>
        </tr>
      </TableHead>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id} onClick={() => navigate(`/app/customers/${customer.id}`)}>
            <Td>
              <div className="flex items-center gap-3">
                <Avatar src={customer.photo_url} name={customer.name} />
                <div className="min-w-0">
                  <p className="truncate font-devanagari text-sm font-medium text-navy">
                    {customer.name}, {customer.age}
                  </p>
                  <p className="truncate font-devanagari text-xs text-muted">{customer.father_husband}</p>
                </div>
              </div>
            </Td>
            <Td className="text-sm text-ink/80">{customer.mobile}</Td>
            <Td className="text-sm font-semibold text-card-id">{customer.card_id}</Td>
            <Td>
              <ValidityBadge validityDate={customer.validity_date} />
            </Td>
            <Td>
              <PrintBadge lastPrintedAt={customer.last_printed_at} compact />
            </Td>
            <Td>
              <CustomerRowActions
                onDelete={(event) => {
                  event.stopPropagation();
                  onDelete(customer);
                }}
              />
            </Td>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Mobile presentation — stacked cards, one tap to open the record. */
function CustomersList({
  customers,
  onDelete,
}: Readonly<{ customers: CustomerListItem[]; onDelete: (c: CustomerListItem) => void }>) {
  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/70 bg-white">
      {customers.map((customer) => (
        <li key={customer.id} className="flex items-center gap-3 px-4 py-3">
          <Link to={`/app/customers/${customer.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar src={customer.photo_url} name={customer.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-devanagari text-sm text-navy">
                नाम: {customer.name}, {customer.age}
              </p>
              <p className="truncate font-devanagari text-xs text-muted">पिता/पति: {customer.father_husband}</p>
              <p className="text-xs font-semibold text-card-id">आई.डि.: {customer.card_id}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <ValidityBadge validityDate={customer.validity_date} />
                <PrintBadge lastPrintedAt={customer.last_printed_at} compact />
              </div>
            </div>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(customer)}
              aria-label="Delete customer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-danger transition-colors duration-150 hover:bg-danger/10"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
            <Link
              to={`/app/customers/${customer.id}`}
              aria-label="View details"
              className="flex h-9 w-9 items-center justify-center rounded-full text-line"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CustomersContent({
  isError,
  isLoading,
  isFetching,
  customers,
  search,
  onRetry,
  onDelete,
}: Readonly<{
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
  customers: CustomerListItem[];
  search: string;
  onRetry: () => void;
  onDelete: (c: CustomerListItem) => void;
}>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-danger/40 bg-danger/5 px-6 py-14 text-center">
        <AlertTriangleIcon className="h-8 w-8 text-danger" />
        <p className="text-sm text-ink">Couldn't load customers.</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="hidden lg:block">
          <Table>
            <TableHead>
              <tr>
                <Th>Customer</Th>
                <Th>Mobile</Th>
                <Th>Card ID</Th>
                <Th>Status</Th>
                <Th>Printed</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              <SkeletonTableRows columns={6} rows={8} />
            </TableBody>
          </Table>
        </div>
        <div className="lg:hidden">
          <SkeletonListRows count={6} />
        </div>
      </>
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        title={search ? "No results found" : "No customers yet"}
        description={
          search
            ? "No customer matches that name, mobile, or card ID. Try a different search."
            : "Registered customers will show up here."
        }
        action={
          !search && (
            <Link to="/app/add-customer" className="text-sm font-medium text-teal transition-colors duration-150 hover:text-teal-hover">
              Register your first customer →
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className={isFetching ? "opacity-60 transition-opacity duration-150" : ""}>
      <div className="hidden lg:block">
        <CustomersTable customers={customers} onDelete={onDelete} />
      </div>
      <div className="lg:hidden">
        <CustomersList customers={customers} onDelete={onDelete} />
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [pendingDelete, setPendingDelete] = useState<CustomerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => listCustomers(page, PAGE_SIZE, search),
    placeholderData: (previous) => previous,
  });

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(pendingDelete.id);
      toast("success", "Customer deleted.");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      toast("error", extractErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  const customers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.total_pages ?? 1;

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${total} registered. Search by name, mobile, or card ID, or open a customer's profile.`}
        action={
          <Link
            to="/app/add-customer"
            className="flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-hover"
          >
            <UserPlusIcon className="h-4 w-4" />
            New Customer
          </Link>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search by name, mobile, or card ID"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      <CustomersContent
        isError={isError}
        isLoading={isLoading}
        isFetching={isFetching}
        customers={customers}
        search={search}
        onRetry={() => refetch()}
        onDelete={setPendingDelete}
      />

      {!isError && !isLoading && customers.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Dialog
        open={pendingDelete !== null}
        title="Delete this customer?"
        description={pendingDelete ? `${pendingDelete.name}'s card (${pendingDelete.card_id}) will be removed from your list.` : undefined}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
