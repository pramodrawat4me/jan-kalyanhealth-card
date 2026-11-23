import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { downloadPrintingReportCsv, fetchPrintingReport } from "../../api/admin";
import { extractErrorMessage } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TableBody, TableHead, TableRow, Td, Th } from "../../components/ui/Table";
import { triggerBlobDownload } from "../../lib/download";
import { toast } from "../../store/toastStore";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function AdminReportsPage() {
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", "printings", startDate, endDate],
    queryFn: () => fetchPrintingReport(startDate, endDate),
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await downloadPrintingReportCsv(startDate, endDate);
      triggerBlobDownload(blob, `printing_report_${startDate}_to_${endDate}.csv`);
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not export the report."));
    } finally {
      setIsExporting(false);
    }
  }

  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + row.print_count, 0);

  return (
    <div>
      <PageHeader
        title="Printing Reports"
        description="Cards printed per partner over a date range."
        action={
          <Button variant="secondary" isLoading={isExporting} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <FormField label="From">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </FormField>
        <FormField label="To">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </FormField>
        <p className="pb-2.5 text-sm text-muted">Total printed: {total}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No printings in this range" description="Try widening the date range." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <Th>Partner</Th>
              <Th>Mobile</Th>
              <Th>Cards Printed</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.partner_id}>
                <Td>{row.partner_name}</Td>
                <Td>{row.partner_mobile}</Td>
                <Td className="font-semibold text-teal">{row.print_count}</Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
