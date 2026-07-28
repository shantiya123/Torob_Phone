import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { StoreOffersExperience } from "@/features/store-offers/components/store-offers-experience";

export const metadata: Metadata = {
  title: "مدیریت پیشنهادها | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function StoreOffersPage() {
  return (
    <RequireRole role="store">
      <StoreOffersExperience />
    </RequireRole>
  );
}
