import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, EmptyState, ErrorState } from "@/components/ui";
import { OfferCard } from "@/features/stores/components/offer-card";
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
      description: store.description.slice(0, 155) || `پیشنهادهای ${store.name} در ترب‌فون.`,
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
      <Container className="py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">
              پیشنهادهای تازه
            </p>
            <h2 className="m-0 text-2xl font-bold sm:text-3xl">آخرین پیشنهادها</h2>
          </div>
          <Link
            href={`/stores/${store.id}/offers`}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-interactive)]"
          >
            مشاهدهٔ همهٔ پیشنهادها
          </Link>
        </div>
        {offersResult.status === "rejected" ? (
          <ErrorState
            title="پیشنهادها بارگذاری نشدند"
            description="اطلاعات فروشگاه در دسترس است؛ پیشنهادها را کمی بعد دوباره ببینید."
          />
        ) : offers && offers.results.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {offers.results.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="پیشنهاد فعالی وجود ندارد"
            description="این فروشگاه در حال حاضر پیشنهاد قابل خریدی منتشر نکرده است."
          />
        )}
      </Container>
    </main>
  );
}
