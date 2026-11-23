import { useQuery } from "@tanstack/react-query";

import { fetchCardBrandConfig } from "../api/cards";

/** Organisation-level card content (facilities, disclaimer, fee, helpline).
 * This almost never changes at runtime, so it's cached indefinitely for the
 * session rather than refetched per card view. */
export function useCardBrandConfig() {
  return useQuery({
    queryKey: ["cards", "brand-config"],
    queryFn: fetchCardBrandConfig,
    staleTime: Infinity,
  });
}
