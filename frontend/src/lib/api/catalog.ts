import type {
  DeviceVariantDetail,
  PaginatedResponse,
  PaginationParams,
  PublicOffer,
  StoreCatalogPhone,
  StoreCatalogPhoneDetail,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";

export const catalogApi = {
  variant(variantId: number, client: ApiClient = apiClient) {
    return client.request<DeviceVariantDetail>(`catalog/device-variants/${variantId}/`);
  },
  variantOffers(
    variantId: number,
    params: PaginationParams & { ordering?: "price" | "price_desc" } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<PublicOffer>>(
      `catalog/device-variants/${variantId}/offers/${buildQuery({ ...paginationQuery(params), ordering: params.ordering })}`,
    );
  },
  phones(params: PaginationParams & { search?: string } = {}, client: ApiClient = apiClient) {
    return client.request<PaginatedResponse<StoreCatalogPhone>>(
      `catalog/phones/${buildQuery({ ...paginationQuery(params), search: params.search })}`,
      { auth: true },
    );
  },
  phone(phoneId: number, client: ApiClient = apiClient) {
    return client.request<StoreCatalogPhoneDetail>(`catalog/phones/${phoneId}/`, { auth: true });
  },
};
