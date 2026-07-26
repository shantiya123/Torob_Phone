import type { IsoDateTime, Money } from "./common";

export interface Wallet {
  id: number;
  balance: Money;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}
export interface WalletTransaction {
  id: number;
  amount: Money;
  balance_after: Money;
  transaction_type: "charge" | "purchase" | "refund";
  order: number | null;
  created_at: IsoDateTime;
}
export interface WalletChargeResponse {
  wallet: Wallet;
  transaction: WalletTransaction;
}
