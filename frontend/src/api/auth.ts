import { apiClient } from "./client";
import type { AdminProfile, AdminSummary, ApiResponse, PartnerProfile, PartnerSummary } from "./types";

interface LoginResponseData {
  access_token: string;
  partner?: PartnerSummary;
  admin?: AdminSummary;
}

export async function loginPartner(mobile: string, password: string) {
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>("/auth/login", { mobile, password });
  return data.data;
}

export async function loginAdmin(mobile: string, password: string) {
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>("/admin/auth/login", { mobile, password });
  return data.data;
}

export async function logoutPartner() {
  await apiClient.post("/auth/logout");
}

export async function logoutAdmin() {
  await apiClient.post("/admin/auth/logout");
}

export async function changePassword(newPassword: string, confirmPassword: string) {
  await apiClient.post("/auth/change-password", {
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}

export async function changeAdminPassword(newPassword: string, confirmPassword: string) {
  await apiClient.post("/admin/auth/change-password", {
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}

export async function fetchCurrentPartner() {
  const { data } = await apiClient.get<ApiResponse<PartnerProfile>>("/auth/me");
  return data.data;
}

export async function fetchCurrentAdmin() {
  const { data } = await apiClient.get<ApiResponse<AdminProfile>>("/admin/auth/me");
  return data.data;
}

export async function uploadAdminPhoto(photo: File) {
  const form = new FormData();
  form.append("photo", photo);
  const { data } = await apiClient.post<ApiResponse<AdminProfile>>("/admin/auth/me/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function completeOnboarding() {
  const { data } = await apiClient.post<ApiResponse<PartnerSummary>>("/auth/onboarding/complete");
  return data.data;
}
