import { useEffect, useState } from "react";

/** Debounces a fast-changing value (typically search input) so dependent
 * queries don't fire on every keystroke. Used by every search box in the
 * app — Customers, Admin Partners, Admin Hospitals, Admin Customers — the
 * design-system audit found none of them debounced before this. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
