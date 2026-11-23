import { apiClient } from "./client";
import type { ApiResponse, CityOption, StateOption, TahsilOption } from "./types";

export async function listStates() {
  const { data } = await apiClient.get<ApiResponse<StateOption[]>>("/locations/states");
  return data.data;
}

export async function listCities(stateId: number) {
  const { data } = await apiClient.get<ApiResponse<CityOption[]>>(`/locations/cities/${stateId}`);
  return data.data;
}

export async function listTahsils(cityId: number) {
  const { data } = await apiClient.get<ApiResponse<TahsilOption[]>>(`/locations/tahsils/${cityId}`);
  return data.data;
}
