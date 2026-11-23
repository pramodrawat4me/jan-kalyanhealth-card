import { useQuery } from "@tanstack/react-query";

import { listCities, listStates, listTahsils } from "../api/locations";

export function useStates() {
  return useQuery({ queryKey: ["locations", "states"], queryFn: listStates, staleTime: 5 * 60_000 });
}

export function useCities(stateId: number | null | undefined) {
  return useQuery({
    queryKey: ["locations", "cities", stateId],
    queryFn: () => listCities(stateId as number),
    enabled: Boolean(stateId),
    staleTime: 5 * 60_000,
  });
}

export function useTahsils(cityId: number | null | undefined) {
  return useQuery({
    queryKey: ["locations", "tahsils", cityId],
    queryFn: () => listTahsils(cityId as number),
    enabled: Boolean(cityId),
    staleTime: 5 * 60_000,
  });
}
