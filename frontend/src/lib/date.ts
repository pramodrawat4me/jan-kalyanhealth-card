/** ISO YYYY-MM-DD → DD-MM-YYYY, matching the format `card_pdf_service`
 * prints on the physical card. Falls back to the raw input for anything
 * that isn't a plain ISO date (already-formatted strings, empty values). */
export function formatDisplayDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return isoDate;
}

/** Full ISO datetime (e.g. a print event's `printed_at`) → "DD-MM-YYYY,
 * h:mm am/pm" in the same DD-MM-YYYY convention as `formatDisplayDate`, with
 * a time component since print events need to be distinguishable within a
 * day. Falls back to the raw input if it isn't a parseable timestamp. */
export function formatDisplayDateTime(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const time = parsed.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${day}-${month}-${parsed.getFullYear()}, ${time}`;
}
