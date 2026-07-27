import type { IsoDateTime, Money } from "./common";
import type { WalletTransaction } from "./wallet";

export type OrderStatus = "pending" | "paid" | "cancelled" | "completed";
export interface OrderSummary {
  id: number;
  status: OrderStatus;
  store: { id: number; name: string };
  item_count: number;
  total: Money;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
export interface OrderVariantSummary {
  id: number;
  brand: string;
  model: string;
  image_url: string | null;
  ram_gb: number;
  storage_gb: number;
  storage_technology: string;
}
export interface OrderItem {
  id: number;
  offer: number;
  variant: OrderVariantSummary;
  quantity: number;
  unit_price: Money;
  line_total: Money;
  created_at: IsoDateTime;
}
export interface Order extends OrderSummary {
  items: OrderItem[];
}
export interface CheckoutResponse {
  checkout_id: string;
  orders: OrderSummary[];
  order_count: number;
  total: Money;
  wallet_balance: Money;
}
export interface OrderCancellationResponse {
  order: Order;
  stock_restored: boolean;
  refund: WalletTransaction | null;
  refund_created: boolean;
  wallet_balance: Money | null;
}
