import { apiClient } from "./client";
import type { ApiResponse, CardSettings } from "./types";

export async function fetchAdminCardSettings() {
  const { data } = await apiClient.get<ApiResponse<CardSettings>>("/admin/card-settings");
  return data.data;
}

export async function updateAdminCardSettings(payload: CardSettings) {
  const { data } = await apiClient.put<ApiResponse<CardSettings>>("/admin/card-settings", payload);
  return data.data;
}
