import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BATCH_PRINT_LIMIT,
  adminDeleteCustomer,
  adminListCustomers,
  adminPrintCardsBatch,
  downloadCustomersCsv,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/client";
import type { AdminCustomer } from "../../api/types";
import { TrashIcon } from "../../components/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { PrintBadge } from "../../components/ui/PrintBadge";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "../../components/ui/Table";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { formatDisplayDate } from "../../lib/date";
import { triggerBlobDownload } from "../../lib/download";
import { toast } from "../../store/toastStore";

const PAGE_SIZE = 20;

export function AdminCustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 350);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Batch print selection — a plain id set so it survives pagination and
  // searches (an admin can gather customers across pages into one batch).
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "customers", page, search],
    queryFn: () => adminListCustomers(page, PAGE_SIZE, search),
    placeholderData: (previous) => previous,
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await downloadCustomersCsv(search);
      triggerBlobDownload(blob, "customers_export.csv");
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not export customers."));
    } finally {
      setIsExporting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await adminDeleteCustomer(pendingDelete.id);
      toast("success", "Customer deleted.");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not delete this customer."));
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBatchPrint() {
    if (selectedIds.size === 0) return;
    setIsBatchPrinting(true);
    try {
      const blob = await adminPrintCardsBatch([...selectedIds]);
      const stamp = new Date();
      const dd = String(stamp.getDate()).padStart(2, "0");
      const mm = String(stamp.getMonth() + 1).padStart(2, "0");
      triggerBlobDownload(blob, `cards_batch_${dd}-${mm}-${stamp.getFullYear()}.pdf`);
      toast("success", `${selectedIds.size} card${selectedIds.size > 1 ? "s" : ""} downloaded in one PDF.`);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not generate the batch PDF."));
    } finally {
      setIsBatchPrinting(false);
    }
  }

  const customers = data?.data ?? [];
  const totalPages = data?.meta?.total_pages ?? 1;
  const showInitialSpinner = isLoading && !data;
  const allOnPageSelected = customers.length > 0 && customers.every((c) => selectedIds.has(c.id));
  const overLimit = selectedIds.size > BATCH_PRINT_LIMIT;

  function toggleAllOnPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allOnPageSelected) {
        for (const c of customers) next.delete(c.id);
      } else {
        for (const c of customers) next.add(c.id);
      }
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Customer Overview"
        description="Search customers across every partner."
        action={
          <Button variant="secondary" isLoading={isExporting} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <Input
        placeholder="Search by name, mobile, or card ID"
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setPage(1);
        }}
        className="mb-4 max-w-sm"
      />

      <p className="mb-4 text-xs text-muted">
        Open a customer to view the printable card, or tick several and print them together — four cards per A4
        page, front and back side by side.
      </p>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-teal/30 bg-teal-light/50 px-4 py-3">
          <p className="text-sm font-medium text-navy">
            {selectedIds.size} selected
            {overLimit && (
              <span className="ml-2 text-danger">— maximum {BATCH_PRINT_LIMIT} per batch</span>
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={isBatchPrinting}>
              Clear
            </Button>
            <Button size="sm" isLoading={isBatchPrinting} disabled={overLimit} onClick={handleBatchPrint}>
              Print Selected Cards
            </Button>
          </div>
        </div>
      )}

      {showInitialSpinner && (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      )}

      {!showInitialSpinner && customers.length === 0 && (
        <EmptyState
          title={search ? "No results found" : "No customers yet"}
          description={
            search
              ? "No customer matches that name, mobile, or card ID. Try a different search."
              : "Registered customers will show up here."
          }
        />
      )}

      {!showInitialSpinner && customers.length > 0 && (
        <div className={isFetching ? "opacity-60 transition-opacity duration-150" : ""}>
          <Table>
            <TableHead>
              <TableRow>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all customers on this page"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 rounded border-line text-teal focus:ring-teal"
                  />
                </Th>
                <Th>Customer</Th>
                <Th>Card ID</Th>
                <Th>Mobile</Th>
                <Th>Partner</Th>
                <Th>Validity</Th>
                <Th>Printed</Th>
                <Th className="text-right">Actions</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} onClick={() => navigate(`/admin/customers/${customer.id}`)}>
                  <Td onClick={(event) => event.stopPropagation()} className="w-10">
                    <input
                      type="checkbox"
                      aria-label={`Select ${customer.name} for batch printing`}
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelected(customer.id)}
                      className="h-4 w-4 rounded border-line text-teal focus:ring-teal"
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar src={customer.photo_url} name={customer.name} />
                      <span>{customer.name}</span>
                    </div>
                  </Td>
                  <Td className="font-semibold text-card-id">{customer.card_id}</Td>
                  <Td>{customer.mobile}</Td>
                  <Td>{customer.partner_name}</Td>
                  <Td>
                    <Badge tone={new Date(customer.validity_date) >= new Date() ? "success" : "danger"}>
                      {formatDisplayDate(customer.validity_date)}
                    </Badge>
                  </Td>
                  <Td>
                    <PrintBadge lastPrintedAt={customer.last_printed_at} compact />
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDelete(customer);
                        }}
                        aria-label={`Delete ${customer.name}`}
                        title="Delete customer"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-danger transition-colors duration-150 hover:bg-danger/10"
                      >
                        <TrashIcon className="h-4 w-4" />
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
        title="Delete this customer?"
        description={
          pendingDelete
            ? `${pendingDelete.name}'s record (${pendingDelete.card_id}) will be removed. This can't be undone from here.`
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
