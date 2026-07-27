import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { OrderDetailExperience } from "@/features/orders/components/order-detail-experience";

export const metadata: Metadata = {
  title: "جزئیات سفارش | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function OrderDetailPage() {
  return (
    <RequireRole role="customer">
      <OrderDetailExperience />
    </RequireRole>
  );
}
