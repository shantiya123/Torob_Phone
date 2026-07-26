import type { PaginationParams } from "@/types/api";

export type QueryValue =
  string | number | boolean | readonly (string | number | boolean)[] | null | undefined;

export function buildQuery(values: Readonly<Record<string, QueryValue>>): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(values).sort()) {
    const value = values[key];
    if (value === null || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function paginationQuery(params: PaginationParams = {}): Record<string, number | undefined> {
  const { page, pageSize } = params;
  if (page !== undefined && (!Number.isInteger(page) || page < 1))
    throw new RangeError("page must be an integer >= 1");
  if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)) {
    throw new RangeError("pageSize must be an integer between 1 and 100");
  }
  return { page, page_size: pageSize };
}
