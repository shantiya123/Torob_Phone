import { ApiClient, apiClient } from "@/lib/api";
import { buildQuery, paginationQuery } from "@/lib/api/query";
import { paginatedSchema, publicStoreSchema } from "@/lib/api/schemas";
import type { PaginatedResponse, PublicStoreListItem } from "@/types/api";
import type { HomeStoreState } from "../types";

const HOME_STORE_LIMIT = 6;
export const HOME_PUBLIC_REQUEST_COUNT = 1;

export async function getHomeStores(client: ApiClient = apiClient): Promise<HomeStoreState> {
  try {
    const response = await client.request<PaginatedResponse<PublicStoreListItem>>(
      `stores/${buildQuery(paginationQuery({ pageSize: HOME_STORE_LIMIT }))}`,
      {
        next: { revalidate: 60 },
        schema: paginatedSchema(publicStoreSchema),
      },
    );
    if (response.results.length === 0) return { status: "empty", stores: [] };
    return { status: "ready", stores: response.results };
  } catch {
    return { status: "error", stores: [] };
  }
}
