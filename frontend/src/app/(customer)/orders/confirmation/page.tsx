import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { OrderConfirmationExperience } from "@/features/orders/components/order-confirmation-experience";

export const metadata: Metadata = {
  title: "تأیید سفارش | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function OrderConfirmationPage() {
  return (
    <RequireRole role="customer">
      <OrderConfirmationExperience />
    </RequireRole>
  );
}
