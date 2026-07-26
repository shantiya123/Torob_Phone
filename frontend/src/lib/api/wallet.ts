import { z } from "zod";
import type {
  PaginatedResponse,
  PaginationParams,
  Wallet,
  WalletChargeResponse,
  WalletTransaction,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { buildQuery, paginationQuery } from "./query";
import { moneySchema, walletSchema } from "./schemas";

const transactionSchema = z
  .object({
    id: z.number().int().positive(),
    amount: moneySchema,
    balance_after: moneySchema,
    transaction_type: z.enum(["charge", "purchase", "refund"]),
    order: z.number().int().nullable(),
    created_at: z.string(),
  })
  .strict();
const chargeSchema = z.object({ wallet: walletSchema, transaction: transactionSchema }).strict();

export const walletApi = {
  get(client: ApiClient = apiClient) {
    return client.request<Wallet>("wallet/", { auth: true, schema: walletSchema });
  },
  transactions(params: PaginationParams = {}, client: ApiClient = apiClient) {
    return client.request<PaginatedResponse<WalletTransaction>>(
      `wallet/transactions/${buildQuery(paginationQuery(params))}`,
      { auth: true },
    );
  },
  charge(amount: number, idempotencyKey: string, client: ApiClient = apiClient) {
    return client.request<WalletChargeResponse, { amount: number }>("wallet/charge/", {
      method: "POST",
      auth: true,
      json: { amount },
      idempotencyKey,
      expectedStatuses: [200, 201],
      schema: chargeSchema,
    });
  },
};
