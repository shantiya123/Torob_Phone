import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { CreateStoreOfferExperience } from "@/features/store-offers/components/create-store-offer-experience";

export const metadata: Metadata = {
  title: "ایجاد پیشنهاد جدید | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function CreateStoreOfferPage() {
  return (
    <RequireRole role="store">
      <CreateStoreOfferExperience />
    </RequireRole>
  );
}
