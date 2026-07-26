import type {
  PaginatedResponse,
  PublicOffer,
  PublicStoreDetail,
  PublicStoreListItem,
} from "@/types/api";

export type StoreListState =
  | { status: "ready"; data: PaginatedResponse<PublicStoreListItem> }
  | { status: "error"; data: null };

export type StorefrontOffersState =
  | { status: "ready"; data: PaginatedResponse<PublicOffer> }
  | { status: "empty"; data: PaginatedResponse<PublicOffer> }
  | { status: "error"; data: null };

export type StorefrontData = {
  store: PublicStoreDetail;
  offers: StorefrontOffersState;
};
