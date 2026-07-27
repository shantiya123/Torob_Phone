import type { Basket, BasketItem } from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { basketItemSchema, basketSchema } from "./schemas";

export const basketApi = {
  get(client: ApiClient = apiClient) {
    return client.request<Basket>("basket/", { auth: true, schema: basketSchema });
  },
  add(offer: number, quantity: number, client: ApiClient = apiClient) {
    return client.request<BasketItem, { offer: number; quantity: number }>("basket/items/", {
      method: "POST",
      auth: true,
      json: { offer, quantity },
      expectedStatuses: [201],
    });
  },
  update(itemId: number, quantity: number, client: ApiClient = apiClient) {
    return client.request<BasketItem, { quantity: number }>(`basket/items/${itemId}/`, {
      method: "PATCH",
      auth: true,
      json: { quantity },
      schema: basketItemSchema,
    });
  },
  remove(itemId: number, client: ApiClient = apiClient) {
    return client.request<void>(`basket/items/${itemId}/`, {
      method: "DELETE",
      auth: true,
      expectedStatuses: [204],
    });
  },
};
