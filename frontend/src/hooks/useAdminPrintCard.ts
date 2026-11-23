import { useState } from "react";

import { adminPrintCard } from "../api/admin";
import { extractErrorMessage } from "../api/client";
import { triggerBlobDownload } from "../lib/download";
import { toast } from "../store/toastStore";

/** Builds `<Customer Name>_<Card ID>.pdf` so the file that lands in the
 * admin's Downloads folder is identifiable by who it belongs to, not a
 * bare card ID. Strips characters that are unsafe across OSes. */
function cardPdfFilename(customerName: string, cardId: string): string {
  const safeName = customerName.trim().replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "_");
  return `${safeName || "customer"}_${cardId}.pdf`;
}

/** Printing is admin-only — this is the one place in the admin app that
 * triggers card generation, used from the Customer Detail page. */
export function useAdminPrintCard() {
  const [printingId, setPrintingId] = useState<number | null>(null);

  async function print(customerId: number, customerName: string, cardId: string) {
    setPrintingId(customerId);
    try {
      const blob = await adminPrintCard(customerId);
      triggerBlobDownload(blob, cardPdfFilename(customerName, cardId));
      toast("success", "Card downloaded (front + back).");
    } catch (error) {
      toast("error", extractErrorMessage(error, "Could not generate the card PDF."));
    } finally {
      setPrintingId(null);
    }
  }

  return { print, printingId, isPrinting: (customerId: number) => printingId === customerId };
}
