import type { Metadata } from "next";
import { RequireRole } from "@/features/auth/components/guards";
import { WalletExperience } from "@/features/wallet/components/wallet-experience";

export const metadata: Metadata = {
  title: "کیف پول | ترب‌فون",
  robots: { index: false, follow: false },
};

export default function WalletPage() {
  return (
    <RequireRole role="customer">
      <WalletExperience />
    </RequireRole>
  );
}
