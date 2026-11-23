/**
 * Small vector icons unique to the printed card (not part of the app-wide
 * icon set in `components/icons.tsx`). Mirrored 1:1 by the matching
 * `_draw_*` helpers in `card_pdf_service.py` so the preview and the PDF
 * never drift.
 */

export function CheckBulletIcon({ className = "h-3 w-3" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={`flex-shrink-0 text-brand-green ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        d="M7 12.5l3 3 7-7"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Headset / support icon used inside the green helpline parallelogram. */
export function HeadsetIcon({ className = "h-3.5 w-3.5" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <path d="M21 16a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" fill="currentColor" stroke="none" />
      <path d="M3 16a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="currentColor" stroke="none" />
      <path d="M3 12v2" />
    </svg>
  );
}

/** Outline shield with a check — used in the disclaimer note box. */
export function ShieldCheckIcon({ className = "h-4 w-4" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 text-ink ${className}`}
      aria-hidden="true"
    >
      <path d="M12 2.5l7 3v5.5c0 4.6-3 8.4-7 9.9-4-1.5-7-5.3-7-9.9V5.5l7-3z" />
      <path d="M9 12.2l2 2 4.2-4.4" />
    </svg>
  );
}

/**
 * Heart-with-cross resting on two cradling hands — the back card's brand
 * emblem next to the tagline, matching the annotated reference exactly.
 * Mirrored by `_draw_heart_hands_icon` in `card_pdf_service.py`.
 */
export function HeartHandsIcon({ className = "h-20 w-20" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 100 100" className={`flex-shrink-0 text-brand-green ${className}`} aria-hidden="true">
      <path
        d="M50 34 C40 18 16 22 16 40 C16 58 50 74 50 74 C50 74 84 58 84 40 C84 22 60 18 50 34 Z"
        fill="currentColor"
      />
      <rect x="45" y="26" width="10" height="26" fill="white" />
      <rect x="34" y="35" width="32" height="10" fill="white" />
      <path
        d="M46 95 C46 84 40 76 33 70 C27 65 22 57 21 49 C20 45 25 43 27 47 C31 55 36 61 42 65"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M54 95 C54 84 60 76 67 70 C73 65 78 57 79 49 C80 45 75 43 73 47 C69 55 64 61 58 65"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
