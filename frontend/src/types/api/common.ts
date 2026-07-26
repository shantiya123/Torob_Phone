export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export type IsoDateTime = string;
export type Money = number;

export interface PublicStoreSummary {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface CompactVariant {
  id: number;
  brand: string;
  model_name: string;
  device_kind: string;
  image_url: string | null;
  storage_gb: number | null;
  ram_gb: number | null;
  storage_technology: string | null;
  is_available: boolean;
}
