import type { ApiError } from "@/lib/api";

export const STORE_PAGE_SIZE = 12;
export const OFFER_PAGE_SIZE = 12;

export function parsePositivePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function parseStoreId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

export function isApiNotFound(error: unknown): boolean {
  return (error as ApiError)?.status === 404;
}

export function safeSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 100);
}

export type OfferOrdering = "newest" | "price_asc" | "price_desc";

export function parseOfferOrdering(value: string | undefined): OfferOrdering {
  return value === "price_asc" || value === "price_desc" ? value : "newest";
}
