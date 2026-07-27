import type { OrderStatus } from "@/types/api";

type StatusPresentation = {
  label: string;
  tone: "info" | "success" | "warning" | "danger";
};

const ORDER_STATUS: Record<OrderStatus, StatusPresentation> = {
  pending: { label: "در انتظار", tone: "warning" },
  paid: { label: "پرداخت‌شده", tone: "success" },
  cancelled: { label: "لغوشده", tone: "danger" },
  completed: { label: "تکمیل‌شده", tone: "success" },
};

export function getOrderStatusPresentation(status: string): StatusPresentation {
  if (status in ORDER_STATUS) return ORDER_STATUS[status as OrderStatus];
  return { label: "وضعیت نامشخص", tone: "info" };
}
