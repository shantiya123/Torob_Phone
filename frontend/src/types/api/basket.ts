import type { IsoDateTime, Money } from "./common";
import type { PublicOffer } from "./offers";

export interface BasketItem {
  id: number;
  offer: PublicOffer;
  quantity: number;
  unit_price: Money;
  total: Money;
  expires_at: IsoDateTime;
  remaining_seconds: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
export interface Basket {
  id: number;
  items: BasketItem[];
  total: Money;
  next_expiration_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
