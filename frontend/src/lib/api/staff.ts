import type {
  PaginatedResponse,
  PaginationParams,
  StaffStoreReview,
  StoreStatus,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";

export const staffApi = {
  queue(
    params: PaginationParams & { status?: StoreStatus; search?: string } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<StaffStoreReview>>(
      `staff/store-reviews/${buildQuery({ ...paginationQuery(params), status: params.status, search: params.search })}`,
      { auth: true },
    );
  },
  detail(storeId: number, client: ApiClient = apiClient) {
    return client.request<StaffStoreReview>(`staff/store-reviews/${storeId}/`, { auth: true });
  },
  approve(storeId: number, client: ApiClient = apiClient) {
    return client.request<StaffStoreReview>(`staff/store-reviews/${storeId}/approve/`, {
      method: "POST",
      auth: true,
    });
  },
  reject(storeId: number, rejection_reason: string, client: ApiClient = apiClient) {
    return client.request<StaffStoreReview, { rejection_reason: string }>(
      `staff/store-reviews/${storeId}/reject/`,
      { method: "POST", auth: true, json: { rejection_reason } },
    );
  },
};
