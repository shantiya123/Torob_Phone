import type { CompactVariant } from "./common";

export type TorobcheOrdering =
  "price_asc" | "price_desc" | "newest" | "oldest" | "battery_high" | "battery_low";

export interface NumericRange {
  min: number | null;
  max: number | null;
}

export interface TorobcheQuerySet {
  brand: string | null;
  model: string | null;
  release_date: string | null;
  source: { name: string | null; url: string | null };
  performance: {
    chipset: string | null;
    cpu: string | null;
    gpu: string | null;
    storage_type: string | null;
    variants: { ram_gb: NumericRange; storage_gb: NumericRange };
  };
  display: {
    size_inches: NumericRange;
    resolution_width: NumericRange;
    resolution_height: NumericRange;
    technology: string | null;
    refresh_rate_hz: NumericRange;
    brightness_peak_nits: NumericRange;
    hdr: boolean | null;
  };
  battery: {
    capacity_mah: NumericRange;
    charging_w: NumericRange;
    wireless_charging: boolean | null;
  };
  camera: {
    main_mp: NumericRange;
    ultrawide_mp: NumericRange;
    macro_mp: NumericRange;
    selfie_mp: NumericRange;
    ois: boolean | null;
    video_max_resolution: string | null;
    video_max_fps: NumericRange;
  };
  connectivity: {
    "5g": boolean | null;
    wifi_version: string | null;
    bluetooth_version: string | null;
    nfc: boolean | null;
  };
  physical: { weight_g: NumericRange; ip_rating: string | null };
  software: {
    os: string | null;
    android_version: NumericRange;
    major_updates: NumericRange;
  };
  benchmarks: { antutu: NumericRange; geekbench: NumericRange; "3dmark": NumericRange };
  price: NumericRange;
}

export interface TorobcheResult extends CompactVariant {
  minimum_available_price: number | null;
}

export interface TorobcheSearchResponse {
  message: string;
  query_set: TorobcheQuerySet;
  queryset: TorobcheQuerySet;
  count: number;
  next: string | null;
  previous: string | null;
  results: TorobcheResult[];
  ordering: TorobcheOrdering;
  warning?: string | null | undefined;
  warning_code?: string | null | undefined;
}

export interface TorobcheStateResponse {
  query_set?: TorobcheQuerySet | undefined;
  queryset: TorobcheQuerySet;
  has_active_filters: boolean;
  updated_at: string | null;
}

export interface TorobcheResetResponse {
  message: string;
  query_set?: TorobcheQuerySet | undefined;
  queryset: TorobcheQuerySet;
}

export type TorobcheSearchInput =
  | { message: string; ordering?: TorobcheOrdering }
  | { query_set: TorobcheQuerySet; ordering?: TorobcheOrdering };
