import { apiClient } from "./client";
import type { ApiResponse, CardBrandConfig, PartnerDashboardSummary, PrintLogItem, PublicCardStatus } from "./types";

/** Printing a card is admin-only — see `adminPrintCard` in `api/admin.ts`.
 * These endpoints are read-only history for the partner's own customers. */
export async function todaysPrintedCards() {
  const { data } = await apiClient.get<ApiResponse<PrintLogItem[]>>("/cards/today");
  return data.data;
}

export async function printingHistory(page: number, limit: number) {
  const { data } = await apiClient.get<ApiResponse<PrintLogItem[]>>("/cards/printings", { params: { page, limit } });
  return data;
}

export async function publicCardStatus(cardId: string) {
  const { data } = await apiClient.get<ApiResponse<PublicCardStatus>>(`/cards/public/${cardId}`);
  return data.data;
}

export async function fetchCardBrandConfig() {
  const { data } = await apiClient.get<ApiResponse<CardBrandConfig>>("/cards/brand-config");
  return data.data;
}

export async function fetchPartnerDashboardSummary() {
  const { data } = await apiClient.get<ApiResponse<PartnerDashboardSummary>>("/cards/dashboard-summary");
  return data.data;
}
