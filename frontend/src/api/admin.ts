import { apiClient } from "./client";
import type {
  AdminCustomer,
  ApiResponse,
  CardActivity,
  CityOption,
  DashboardSummary,
  Hospital,
  PartnerAdmin,
  PartnerPrintingReportRow,
  StateOption,
  TahsilOption,
} from "./types";

export async function listPartners(page: number, limit: number, search?: string) {
  const { data } = await apiClient.get<ApiResponse<PartnerAdmin[]>>("/admin/partners", {
    params: { page, limit, search: search || undefined },
  });
  return data;
}

export interface CreatePartnerPayload {
  name: string;
  mobile: string;
  password: string;
  state_id: number;
  city_id: number;
  tahsil_id: number;
  photo?: File | null;
}

export async function createPartner(payload: CreatePartnerPayload) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("mobile", payload.mobile);
  form.append("password", payload.password);
  form.append("state_id", String(payload.state_id));
  form.append("city_id", String(payload.city_id));
  form.append("tahsil_id", String(payload.tahsil_id));
  if (payload.photo) {
    form.append("photo", payload.photo);
  }

  const { data } = await apiClient.post<ApiResponse<PartnerAdmin>>("/admin/partners", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function activatePartner(id: number) {
  const { data } = await apiClient.patch<ApiResponse<PartnerAdmin>>(`/admin/partners/${id}/activate`);
  return data.data;
}

export async function deactivatePartner(id: number) {
  const { data } = await apiClient.patch<ApiResponse<PartnerAdmin>>(`/admin/partners/${id}/deactivate`);
  return data.data;
}

export async function deletePartner(id: number) {
  await apiClient.delete(`/admin/partners/${id}`);
}

export async function listHospitalsAdmin(page: number, limit: number) {
  const { data } = await apiClient.get<ApiResponse<Hospital[]>>("/admin/hospitals", { params: { page, limit } });
  return data;
}

export interface HospitalPayload {
  name: string;
  address?: string;
  city_id?: number;
  state_id?: number;
  phone?: string;
  discount_details?: string;
}

export async function createHospital(payload: HospitalPayload) {
  const { data } = await apiClient.post<ApiResponse<Hospital>>("/admin/hospitals", payload);
  return data.data;
}

export async function updateHospital(id: number, payload: Partial<HospitalPayload>) {
  const { data } = await apiClient.put<ApiResponse<Hospital>>(`/admin/hospitals/${id}`, payload);
  return data.data;
}

export async function toggleHospital(id: number) {
  const { data } = await apiClient.patch<ApiResponse<Hospital>>(`/admin/hospitals/${id}/toggle`);
  return data.data;
}

export async function deleteHospital(id: number) {
  await apiClient.delete(`/admin/hospitals/${id}`);
}

export async function createState(name: string) {
  const { data } = await apiClient.post<ApiResponse<StateOption>>("/admin/locations/states", { name });
  return data.data;
}

export async function createCity(name: string, stateId: number) {
  const { data } = await apiClient.post<ApiResponse<CityOption>>("/admin/locations/cities", {
    name,
    state_id: stateId,
  });
  return data.data;
}

export async function createTahsil(name: string, cityId: number) {
  const { data } = await apiClient.post<ApiResponse<TahsilOption>>("/admin/locations/tahsils", {
    name,
    city_id: cityId,
  });
  return data.data;
}

export async function deleteState(id: number) {
  await apiClient.delete(`/admin/locations/states/${id}`);
}

export async function deleteCity(id: number) {
  await apiClient.delete(`/admin/locations/cities/${id}`);
}

export async function deleteTahsil(id: number) {
  await apiClient.delete(`/admin/locations/tahsils/${id}`);
}

export async function adminListCustomers(page: number, limit: number, search?: string, partnerId?: number) {
  const { data } = await apiClient.get<ApiResponse<AdminCustomer[]>>("/admin/customers", {
    params: { page, limit, search: search || undefined, partner_id: partnerId },
  });
  return data;
}

export async function adminGetCustomer(customerId: number) {
  const { data } = await apiClient.get<ApiResponse<AdminCustomer>>(`/admin/customers/${customerId}`);
  return data.data;
}

export async function adminDeleteCustomer(customerId: number) {
  await apiClient.delete(`/admin/customers/${customerId}`);
}

/** The only card-printing entry point in the app — printing is admin-only. */
export async function adminPrintCard(customerId: number): Promise<Blob> {
  const response = await apiClient.get(`/admin/customers/${customerId}/print`, { responseType: "blob" });
  return response.data;
}

/** How many customers one batch print may contain — mirrors the backend's
 * `BatchPrintIn` cap (card generation is CPU-bound server-side). */
export const BATCH_PRINT_LIMIT = 20;

/** "Print selected" — one combined A4 PDF, four customers per page. */
export async function adminPrintCardsBatch(customerIds: number[]): Promise<Blob> {
  const response = await apiClient.post(
    "/admin/customers/print-batch",
    { customer_ids: customerIds },
    { responseType: "blob" },
  );
  return response.data;
}

export async function adminGetCustomerActivity(customerId: number) {
  const { data } = await apiClient.get<ApiResponse<CardActivity[]>>(`/admin/customers/${customerId}/activity`);
  return data.data;
}

export async function downloadCustomersCsv(search?: string): Promise<Blob> {
  const response = await apiClient.get("/admin/customers/export", {
    params: { search: search || undefined },
    responseType: "blob",
  });
  return response.data;
}

export async function fetchDashboardSummary() {
  const { data } = await apiClient.get<ApiResponse<DashboardSummary>>("/admin/dashboard");
  return data.data;
}

export async function fetchPrintingReport(startDate?: string, endDate?: string) {
  const { data } = await apiClient.get<ApiResponse<PartnerPrintingReportRow[]>>("/admin/reports/printings", {
    params: { start_date: startDate, end_date: endDate },
  });
  return data.data;
}

export async function downloadPrintingReportCsv(startDate?: string, endDate?: string): Promise<Blob> {
  const response = await apiClient.get("/admin/reports/printings/export", {
    params: { start_date: startDate, end_date: endDate },
    responseType: "blob",
  });
  return response.data;
}
