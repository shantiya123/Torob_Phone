import type {
  PaginatedResponse,
  PaginationParams,
  PublicOffer,
  PublicStoreDetail,
  PublicStoreListItem,
  StoreDashboardResponse,
  StoreOwnerProfile,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";
import { paginatedSchema, publicStoreSchema } from "./schemas";

export const storesApi = {
  list(params: PaginationParams & { search?: string } = {}, client: ApiClient = apiClient) {
    return client.request<PaginatedResponse<PublicStoreListItem>>(
      `stores/${buildQuery({ ...paginationQuery(params), search: params.search })}`,
      { schema: paginatedSchema(publicStoreSchema) },
    );
  },
  detail(storeId: number, client: ApiClient = apiClient) {
    return client.request<PublicStoreDetail>(`stores/${storeId}/`);
  },
  offers(
    storeId: number,
    params: PaginationParams & { ordering?: "newest" | "price_asc" | "price_desc" } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<PublicOffer>>(
      `stores/${storeId}/offers/${buildQuery({ ...paginationQuery(params), ordering: params.ordering })}`,
    );
  },
  mine(client: ApiClient = apiClient) {
    return client.request<StoreOwnerProfile>("stores/me/", { auth: true });
  },
  updateMine(
    body: Partial<
      Pick<
        StoreOwnerProfile,
        "name" | "description" | "logo" | "business_phone" | "business_email" | "address"
      >
    >,
    client: ApiClient = apiClient,
  ) {
    return client.request<StoreOwnerProfile, typeof body>("stores/me/", {
      method: "PATCH",
      auth: true,
      json: body,
    });
  },
  dashboard(client: ApiClient = apiClient) {
    return client.request<StoreDashboardResponse>("stores/me/dashboard/", { auth: true });
  },
};
