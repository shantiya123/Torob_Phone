import type { Metadata } from "next";
import { AccountExperience } from "@/features/account/components/account-experience";
import { RequireRole } from "@/features/auth/components/guards";

export const metadata: Metadata = {
  title: "حساب کاربری | ترب فون",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <RequireRole role="customer">
      <AccountExperience />
    </RequireRole>
  );
}
