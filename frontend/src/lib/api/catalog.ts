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
import { deviceVariantDetailSchema, paginatedSchema, publicOfferSchema } from "./schemas";

export const catalogApi = {
  variant(variantId: number, client: ApiClient = apiClient) {
    return client.request<DeviceVariantDetail>(`catalog/device-variants/${variantId}/`, {
      next: { revalidate: 60 },
      schema: deviceVariantDetailSchema,
    });
  },
  variantOffers(
    variantId: number,
    params: PaginationParams & { ordering?: "price" | "price_desc" } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<PublicOffer>>(
      `catalog/device-variants/${variantId}/offers/${buildQuery({ ...paginationQuery(params), ordering: params.ordering })}`,
      {
        next: { revalidate: 20 },
        schema: paginatedSchema(publicOfferSchema),
      },
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
