import type {
  PaginatedResponse,
  PaginationParams,
  Wallet,
  WalletChargeResponse,
  WalletTransaction,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";
import {
  walletChargeResponseSchema,
  walletSchema,
  walletTransactionListSchema,
} from "./schemas";

export const walletApi = {
  get(client: ApiClient = apiClient) {
    return client.request<Wallet>("wallet/", { auth: true, schema: walletSchema });
  },
  transactions(params: PaginationParams = {}, client: ApiClient = apiClient) {
    return client.request<PaginatedResponse<WalletTransaction>>(
      `wallet/transactions/${buildQuery(paginationQuery(params))}`,
      { auth: true, schema: walletTransactionListSchema },
    );
  },
  charge(amount: number, idempotencyKey: string, client: ApiClient = apiClient) {
    return client.request<WalletChargeResponse, { amount: number }>("wallet/charge/", {
      method: "POST",
      auth: true,
      json: { amount },
      idempotencyKey,
      expectedStatuses: [200, 201],
      schema: walletChargeResponseSchema,
    });
  },
};
