import type { Metadata } from "next";
import { FeaturedStores } from "@/features/home/components/featured-stores";
import { FinalCta } from "@/features/home/components/final-cta";
import { HomeHero } from "@/features/home/components/home-hero";
import { MarketplaceProcess } from "@/features/home/components/marketplace-process";
import { TorobcheSection } from "@/features/home/components/torobche-section";
import { getHomeStores } from "@/features/home/data/home-data";

export const metadata: Metadata = {
  title: "انتخاب دقیق گوشی",
  description: "نیازت را با Torobche روشن کن و پیشنهاد فروشگاه‌های فعال را بررسی کن.",
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const stores = await getHomeStores();
  return (
    <main id="main-content" tabIndex={-1}>
      <HomeHero />
      <TorobcheSection />
      <MarketplaceProcess />
      <FeaturedStores state={stores} />
      <FinalCta />
    </main>
  );
}
