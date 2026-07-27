import type { Metadata } from "next";
import { RequireTorobcheAccess } from "@/features/auth/components/guards";
import { TorobcheExperience } from "@/features/torobche/components/torobche-experience";

export const metadata: Metadata = {
  title: "تربچه | جست‌وجوی هوشمند گوشی",
  description: "نیازت را به تربچه بگو و مدل‌های دقیق موجود در کاتالوگ ترب‌فون را پیدا کن.",
  robots: { index: false, follow: false },
};

export default function TorobchePage() {
  return (
    <RequireTorobcheAccess>
      <TorobcheExperience />
    </RequireTorobcheAccess>
  );
}
