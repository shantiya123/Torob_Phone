import type { WalletTransaction } from "@/types/api";

const labels: Record<WalletTransaction["transaction_type"], string> = {
  charge: "افزایش موجودی آزمایشی",
  purchase: "پرداخت سفارش",
  refund: "بازگشت وجه سفارش",
};

export function getWalletTransactionLabel(type: string): string {
  return labels[type as WalletTransaction["transaction_type"]] ?? "تراکنش نامشخص";
}

export function getWalletTransactionDirection(amount: number): "credit" | "debit" | "neutral" {
  return amount > 0 ? "credit" : amount < 0 ? "debit" : "neutral";
}
