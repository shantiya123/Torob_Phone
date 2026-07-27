import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreOfferPreview } from "@/features/stores/components/store-offer-preview";
import { StoreIdentity } from "@/features/stores/components/store-identity";
import { isApiNotFound, parseStoreId } from "@/features/stores/utils";
import { storesApi } from "@/lib/api/stores";

type RouteParams = Promise<{ storeId: string }>;

export const revalidate = 60;

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const storeId = parseStoreId((await params).storeId);
  if (!storeId) return { title: "فروشگاه | ترب‌فون" };
  try {
    const store = await storesApi.detail(storeId);
    return {
      title: `${store.name} | ترب‌فون`,
      ...(store.description?.trim()
        ? { description: store.description.trim().slice(0, 155) }
        : {}),
    };
  } catch {
    return { title: "فروشگاه | ترب‌فون" };
  }
}

export default async function StorefrontPage({ params }: { params: RouteParams }) {
  const storeId = parseStoreId((await params).storeId);
  if (!storeId) notFound();

  const [storeResult, offersResult] = await Promise.allSettled([
    storesApi.detail(storeId),
    storesApi.offers(storeId, { page: 1, pageSize: 5, ordering: "newest" }),
  ]);

  if (storeResult.status === "rejected") {
    if (isApiNotFound(storeResult.reason)) notFound();
    throw storeResult.reason;
  }

  const store = storeResult.value;
  const offers = offersResult.status === "fulfilled" ? offersResult.value : null;

  return (
    <main id="main-content">
      <StoreIdentity store={store} />
      <StoreOfferPreview
        store={store}
        offers={offers?.results ?? []}
        failed={offersResult.status === "rejected"}
      />
    </main>
  );
}
