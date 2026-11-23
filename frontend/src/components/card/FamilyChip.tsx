/**
 * White family/people chip used in the navy footer — matches the annotated
 * reference (rounded square frame + three silhouettes). Mirrored in
 * `card_pdf_service._draw_family_chip` so the PDF never drifts.
 */
export function FamilyChip({ className = "h-7 w-7" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      <rect x="1.25" y="1.25" width="25.5" height="25.5" rx="5" stroke="white" strokeWidth="1.75" />
      {/* Back-left person */}
      <circle cx="9" cy="10.5" r="2.4" fill="white" />
      <path d="M5.2 18.8c.5-2.4 2.1-3.6 3.8-3.6s3.3 1.2 3.8 3.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      {/* Back-right person */}
      <circle cx="19" cy="10.5" r="2.4" fill="white" />
      <path d="M15.2 18.8c.5-2.4 2.1-3.6 3.8-3.6s3.3 1.2 3.8 3.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      {/* Front-center person (slightly larger) */}
      <circle cx="14" cy="11.2" r="2.9" fill="white" />
      <path d="M9.4 20.2c.7-2.8 2.6-4.2 4.6-4.2s3.9 1.4 4.6 4.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
