import type {
  CheckoutResponse,
  Order,
  OrderCancellationResponse,
  OrderStatus,
  OrderSummary,
  PaginatedResponse,
  PaginationParams,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";
import { checkoutSchema, orderCancellationResponseSchema, orderDetailSchema, orderListSchema } from "./schemas";

export const ordersApi = {
  checkout(idempotencyKey: string, client: ApiClient = apiClient) {
    return client.request<CheckoutResponse, Record<string, never>>("orders/", {
      method: "POST",
      auth: true,
      json: {},
      idempotencyKey,
      expectedStatuses: [200, 201],
      schema: checkoutSchema,
    });
  },
  list(params: PaginationParams & { status?: OrderStatus } = {}, client: ApiClient = apiClient) {
    return client.request<PaginatedResponse<OrderSummary>>(
      `orders/${buildQuery({ ...paginationQuery(params), status: params.status })}`,
      { auth: true, schema: orderListSchema },
    );
  },
  detail(orderId: number, client: ApiClient = apiClient) {
    return client.request<Order>(`orders/${orderId}/`, { auth: true, schema: orderDetailSchema });
  },
  cancel(orderId: number, client: ApiClient = apiClient) {
    return client.request<OrderCancellationResponse>(`orders/${orderId}/cancel/`, {
      method: "POST",
      auth: true,
      json: {},
      schema: orderCancellationResponseSchema,
    });
  },
  storeList(
    params: PaginationParams & { status?: OrderStatus } = {},
    client: ApiClient = apiClient,
  ) {
    return client.request<PaginatedResponse<OrderSummary>>(
      `stores/me/orders/${buildQuery({ ...paginationQuery(params), status: params.status })}`,
      { auth: true },
    );
  },
  storeDetail(orderId: number, client: ApiClient = apiClient) {
    return client.request<Order>(`stores/me/orders/${orderId}/`, { auth: true });
  },
};
