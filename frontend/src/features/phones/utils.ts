import type { ApiError } from "@/lib/api";

export const VARIANT_OFFER_PAGE_SIZE = 20;

export function parseVariantId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseVariantPage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export type VariantOfferOrdering = "price" | "price_desc";

export function parseVariantOrdering(value: string | undefined): VariantOfferOrdering {
  return value === "price_desc" ? "price_desc" : "price";
}

export function isNotFoundError(error: unknown): boolean {
  return (error as ApiError)?.status === 404;
}
