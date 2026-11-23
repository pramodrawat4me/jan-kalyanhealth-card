import { cn } from "../../lib/cn";

/**
 * Decorative curved header background — solid colour block at the top
 * corners that dips into a shallow trough across the centre, leaving a
 * white "window" for the logo while the mobile/ID chips sit on the solid
 * colour at the corners. Mirrors the client-provided reference card design.
 *
 * `currentColor` so the caller picks front (navy) vs. back (green) via a
 * text-color className; `card_pdf_service._draw_header_curve` draws the
 * exact same path (same fractions of card width/zone height) so the PDF
 * and this preview never diverge.
 *
 * SVG path fractions mirror the PDF constants:
 *   _CURVE_EDGE_FRAC  = 0.72  → corners go to y=72 in a 0..100 viewBox
 *   _CURVE_TROUGH_FRAC = 0.06 → centre dip to y=6
 *   ctrl_outer (75%) at x=150 / x=450 (0.25/0.75 of 600)
 *   ctrl_inner (430/600) at x=170 / x=430
 */
export function CardHeaderCurve({
  className,
  heightPercent = 30,
}: Readonly<{ className?: string; heightPercent?: number }>) {
  return (
    <svg
      viewBox="0 0 600 100"
      preserveAspectRatio="none"
      className={cn("absolute inset-x-0 top-0 w-full", className)}
      style={{ height: `${heightPercent}%` }}
      aria-hidden="true"
    >
      <path d="M0,0 H600 V72 C450,72 430,6 300,6 C170,6 150,72 0,72 Z" fill="currentColor" />
    </svg>
  );
}
