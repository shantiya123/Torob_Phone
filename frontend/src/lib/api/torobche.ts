import type {
  TorobcheResetResponse,
  TorobcheSearchInput,
  TorobcheSearchResponse,
  TorobcheStateResponse,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import {
  torobcheResetResponseSchema,
  torobcheSearchResponseSchema,
  torobcheStateResponseSchema,
} from "./schemas";

export const torobcheApi = {
  search(
    input: TorobcheSearchInput,
    page = 1,
    signal?: AbortSignal,
    client: ApiClient = apiClient,
  ) {
    const query = page > 1 ? `?page=${page}` : "";
    return client.request<TorobcheSearchResponse, TorobcheSearchInput>(`search/${query}`, {
      method: "POST",
      auth: true,
      json: input,
      ...(signal ? { signal } : {}),
      timeoutMs: 30_000,
      schema: torobcheSearchResponseSchema,
    });
  },
  state(signal?: AbortSignal, client: ApiClient = apiClient) {
    return client.request<TorobcheStateResponse>("search/state/", {
      auth: true,
      ...(signal ? { signal } : {}),
      schema: torobcheStateResponseSchema,
    });
  },
  reset(signal?: AbortSignal, client: ApiClient = apiClient) {
    return client.request<TorobcheResetResponse>("search/reset/", {
      method: "POST",
      auth: true,
      ...(signal ? { signal } : {}),
      schema: torobcheResetResponseSchema,
    });
  },
};
