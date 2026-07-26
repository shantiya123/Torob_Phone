import type { DeviceVariantDetail, PaginatedResponse, PublicOffer } from "@/types/api";

export interface VariantPageData {
  variant: DeviceVariantDetail;
  offers: PaginatedResponse<PublicOffer>;
}
