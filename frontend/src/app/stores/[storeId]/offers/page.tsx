import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, EmptyState, ErrorState } from "@/components/ui";
import { OfferCard } from "@/features/stores/components/offer-card";
import { StoreIdentity } from "@/features/stores/components/store-identity";
import { Pagination } from "@/features/stores/components/pagination";
import {
  OFFER_PAGE_SIZE,
  isApiNotFound,
  parseOfferOrdering,
  parsePositivePage,
  parseStoreId,
} from "@/features/stores/utils";
import { storesApi } from "@/lib/api/stores";

type RouteParams = Promise<{ storeId: string }>;
type SearchParams = Promise<{ page?: string; ordering?: string }>;

export const revalidate = 30;

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const storeId = parseStoreId((await params).storeId);
  if (!storeId) return { title: "پیشنهادهای فروشگاه | ترب‌فون" };
  try {
    const store = await storesApi.detail(storeId);
    return {
      title: `پیشنهادهای ${store.name} | ترب‌فون`,
      description: `مقایسهٔ پیشنهادهای به‌روز ${store.name} در ترب‌فون.`,
    };
  } catch {
    return { title: "پیشنهادهای فروشگاه | ترب‌فون" };
  }
}

export default async function StoreOffersPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const storeId = parseStoreId((await params).storeId);
  if (!storeId) notFound();
  const query = await searchParams;
  const page = parsePositivePage(query.page);
  const ordering = parseOfferOrdering(query.ordering);

  const [storeResult, offersResult] = await Promise.allSettled([
    storesApi.detail(storeId),
    storesApi.offers(storeId, { page, pageSize: OFFER_PAGE_SIZE, ordering }),
  ]);
  if (storeResult.status === "rejected") {
    if (isApiNotFound(storeResult.reason)) notFound();
    throw storeResult.reason;
  }
  const store = storeResult.value;

  return (
    <main id="main-content">
      <StoreIdentity store={store} />
      <Container className="py-10 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">فهرست کامل</p>
            <h2 className="m-0 text-2xl font-bold sm:text-3xl">پیشنهادهای {store.name}</h2>
          </div>
          <Link
            href={`/stores/${store.id}`}
            className="text-sm font-semibold text-[var(--accent-radish)] hover:underline"
          >
            بازگشت به ویترین
          </Link>
        </div>
        <form method="get" className="mb-8 flex flex-wrap items-end gap-3">
          <label htmlFor="offer-ordering" className="grid gap-2 text-sm font-semibold">
            مرتب‌سازی
            <select
              id="offer-ordering"
              name="ordering"
              defaultValue={ordering}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm focus-visible:outline-none"
            >
              <option value="newest">جدیدترین</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-interactive)]"
          >
            اعمال
          </button>
          <input type="hidden" name="page" value="1" />
        </form>
        {offersResult.status === "rejected" ? (
          <ErrorState
            title="پیشنهادها بارگذاری نشدند"
            description="اطلاعات فروشگاه در دسترس است؛ کمی بعد دوباره تلاش کنید."
          />
        ) : offersResult.value.results.length === 0 ? (
          <EmptyState
            title={
              offersResult.value.count > 0 ? "این صفحه وجود ندارد" : "پیشنهاد فعالی وجود ندارد"
            }
            description="پیشنهادهای موجود این فروشگاه در اینجا نمایش داده می‌شوند."
            action={
              offersResult.value.count > 0 && page > 1 ? (
                <Link
                  href={`/stores/${store.id}/offers?ordering=${ordering}`}
                  className="text-sm font-semibold text-[var(--accent-radish)] underline"
                >
                  بازگشت به صفحهٔ اول
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {offersResult.value.results.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={OFFER_PAGE_SIZE}
              total={offersResult.value.count}
              query={{ ordering }}
              basePath={`/stores/${store.id}/offers`}
            />
          </>
        )}
      </Container>
    </main>
  );
}
