import type { CompactVariant, IsoDateTime, Money } from "./common";

export interface DeviceVariantDetail extends CompactVariant {
  announced_on: string | null;
  released_on: string | null;
  sku_or_region: string | null;
  performance: unknown;
  displays: unknown[];
  battery: unknown;
  cameras: unknown[];
  connectivity: unknown;
  physical: unknown;
  software: unknown;
  benchmarks: unknown[];
}
export interface StoreCatalogPhone {
  id: number;
  brand: string;
  model: string;
  image_url: string | null;
  release_date: string | null;
}
export interface StoreCatalogVariant extends CompactVariant {
  owned_offer: unknown | null;
  market: { offer_count: number; lowest_price: Money | null; highest_price: Money | null };
}
export interface StoreCatalogPhoneDetail extends StoreCatalogPhone {
  variants: StoreCatalogVariant[];
}
export interface SearchResponse {
  query_set: unknown;
  ordering: string;
  results?: CompactVariant[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  message?: string;
  updated_at?: IsoDateTime;
}
