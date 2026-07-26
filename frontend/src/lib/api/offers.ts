import type {
  OfferWriteRequest,
  OperationalOffer,
  PaginatedResponse,
  PaginationParams,
  PublicOffer,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";

export const offersApi = {
  detail(offerId: number, client: ApiClient = apiClient) {
    return client.request<PublicOffer>(`offers/${offerId}/`);
  },
  mine(
    params: PaginationParams & { search?: string; stock?: "available" | "out" } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<OperationalOffer>>(
      `stores/me/offers/${buildQuery({ ...paginationQuery(params), search: params.search, stock: params.stock })}`,
      { auth: true },
    );
  },
  create(
    body: Required<Pick<OfferWriteRequest, "device_variant" | "price" | "quantity">> &
      Pick<OfferWriteRequest, "description">,
    client: ApiClient = apiClient,
  ) {
    return client.request<PublicOffer, typeof body>("offers/", {
      method: "POST",
      auth: true,
      json: body,
      expectedStatuses: [201],
    });
  },
  update(
    offerId: number,
    body: Omit<OfferWriteRequest, "device_variant">,
    client: ApiClient = apiClient,
  ) {
    return client.request<PublicOffer, typeof body>(`offers/${offerId}/`, {
      method: "PATCH",
      auth: true,
      json: body,
    });
  },
  remove(offerId: number, client: ApiClient = apiClient) {
    return client.request<void>(`offers/${offerId}/`, {
      method: "DELETE",
      auth: true,
      expectedStatuses: [204],
    });
  },
};
