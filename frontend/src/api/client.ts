import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "../lib/env";
import { useAuthStore } from "../store/authStore";
import type { ApiErrorBody } from "./types";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const scope = useAuthStore.getState().scope;
  if (!scope) return null;

  const path = scope === "admin" ? "/admin/auth/refresh" : "/auth/refresh";
  try {
    const response = await axios.post(`${API_BASE_URL}${path}`, null, { withCredentials: true });
    const token: string = response.data.data.access_token;
    useAuthStore.getState().setAccessToken(token);
    return token;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retried && !config.url?.includes("/refresh")) {
      config._retried = true;

      // Multiple requests can 401 at once; only issue one refresh call and
      // let everyone else await it.
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;
      if (newToken) {
        config.headers.set("Authorization", `Bearer ${newToken}`);
        return apiClient(config);
      }

      useAuthStore.getState().clearSession();
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function extractFieldErrors(error: unknown): Record<string, string> | null {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.fields ?? null;
  }
  return null;
}
