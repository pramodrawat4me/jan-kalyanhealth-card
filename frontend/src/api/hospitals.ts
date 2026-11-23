import { apiClient } from "./client";
import type { ApiResponse, Hospital } from "./types";

export async function listHospitals() {
  const { data } = await apiClient.get<ApiResponse<Hospital[]>>("/hospitals");
  return data.data;
}
