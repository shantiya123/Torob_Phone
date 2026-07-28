import type { Metadata } from "next";
import { StoreRegistrationExperience } from "@/features/auth/components/store-registration-experience";

export const metadata: Metadata = {
  title: "ثبت فروشگاه | ترب فون",
  description: "ثبت درخواست فروشگاه و ارسال اطلاعات برای بررسی پلتفرم ترب فون.",
};

export default function StoreRegistrationPage() {
  return <StoreRegistrationExperience />;
}
