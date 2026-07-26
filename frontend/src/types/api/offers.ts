import type { CompactVariant, IsoDateTime, Money, PublicStoreSummary } from "./common";

export interface PublicOffer {
  id: number;
  device_variant: CompactVariant;
  store: PublicStoreSummary;
  price: Money;
  quantity: number;
  available: boolean;
  description: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
export interface OperationalOffer extends PublicOffer {
  publicly_available: boolean;
  availability_reason:
    | "store_not_active"
    | "out_of_stock"
    | "variant_unavailable"
    | "device_not_catalog_eligible"
    | null;
}
export interface OfferWriteRequest {
  device_variant?: number;
  price?: Money;
  quantity?: number;
  description?: string | null;
}
