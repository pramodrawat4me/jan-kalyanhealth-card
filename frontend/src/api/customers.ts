import { apiClient } from "./client";
import type { ApiResponse, Customer, CustomerListItem } from "./types";

export interface AddCustomerPayload {
  name: string;
  father_husband: string;
  mobile: string;
  aadhaar_no: string;
  address: string;
  city_id: number;
  dob: string;
  gender: "male" | "female";
  photo: File;
}

export async function listCustomers(page: number, limit: number, search?: string) {
  const { data } = await apiClient.get<ApiResponse<CustomerListItem[]>>("/customers", {
    params: { page, limit, search: search || undefined },
  });
  return data;
}

export async function getCustomer(id: number) {
  const { data } = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
  return data.data;
}

export async function addCustomer(payload: AddCustomerPayload) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("father_husband", payload.father_husband);
  form.append("mobile", payload.mobile);
  form.append("aadhaar_no", payload.aadhaar_no);
  form.append("address", payload.address);
  form.append("city_id", String(payload.city_id));
  form.append("dob", payload.dob);
  form.append("gender", payload.gender);
  form.append("photo", payload.photo);

  const { data } = await apiClient.post<ApiResponse<Customer>>("/customers", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export interface UpdateCustomerPayload {
  name: string;
  father_husband: string;
  mobile: string;
  /** Omit or leave empty to keep the existing Aadhaar on file. */
  aadhaar_no?: string;
  address: string;
  city_id: number;
  dob: string;
  gender: "male" | "female";
  /** Omit to keep the existing photo. */
  photo?: File | null;
}

export async function updateCustomer(id: number, payload: UpdateCustomerPayload) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("father_husband", payload.father_husband);
  form.append("mobile", payload.mobile);
  if (payload.aadhaar_no) {
    form.append("aadhaar_no", payload.aadhaar_no);
  }
  form.append("address", payload.address);
  form.append("city_id", String(payload.city_id));
  form.append("dob", payload.dob);
  form.append("gender", payload.gender);
  if (payload.photo) {
    form.append("photo", payload.photo);
  }

  const { data } = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function deleteCustomer(id: number) {
  await apiClient.delete(`/customers/${id}`);
}

export async function todaysCustomers() {
  const { data } = await apiClient.get<ApiResponse<CustomerListItem[]>>("/customers/today");
  return data.data;
}

export interface FindCustomerParams {
  mobile?: string;
  dob?: string;
  card_id?: string;
}

export async function findCustomers(params: FindCustomerParams) {
  const { data } = await apiClient.get<ApiResponse<Customer[]>>("/customers/find", { params });
  return data.data;
}
