import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { CheckoutExperience } from "@/features/checkout/components/checkout-experience";

export const metadata: Metadata = {
  title: "تسویه حساب | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <RequireRole role="customer">
      <CheckoutExperience />
    </RequireRole>
  );
}
