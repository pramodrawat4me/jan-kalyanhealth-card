/** Small inline stroke icons for the login/landing experience — kept as
 * plain SVG (no icon library dependency) to match the rest of the app's
 * hand-drawn icons (see PasswordInput's show/hide eye icons). */

export interface IconProps {
  className?: string;
}

export function IdCardIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15.6c.6-1.4 1.7-2 3-2s2.4.6 3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 9.3h5M14 12.3h5M14 15.3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HospitalIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 21V9.6a1 1 0 0 1 .5-.87l7-4a1 1 0 0 1 1 0l7 4a1 1 0 0 1 .5.87V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 7.6v5.4M9.3 10.3h5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M9.5 21v-3.6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.2 19 6v5.6c0 4.6-3 7.6-7 9.6-4-2-7-5-7-9.6V6l7-2.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.8 12.3 11 14.4l4.2-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8.3" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.3 19c.7-3 3-4.6 5.7-4.6s5 1.6 5.7 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.8 7.8a2.5 2.5 0 1 1 .4 4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.3 14.5c2 .4 3.5 1.8 4.1 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10.4" width="14" height="9.2" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 12.4 10.7 14.7 15.6 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: Readonly<IconProps>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 5.5 15.5 12 9 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
