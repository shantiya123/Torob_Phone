import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, ErrorState } from "@/components/ui";
import { StoreCard } from "@/features/stores/components/store-card";
import { Pagination } from "@/features/stores/components/pagination";
import { StoreSearch } from "@/features/stores/components/store-search";
import { storesApi } from "@/lib/api/stores";
import { STORE_PAGE_SIZE, parsePositivePage, safeSearch } from "@/features/stores/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "فروشگاه‌ها | ترب‌فون",
  description: "فهرست فروشگاه‌های فعال و قابل اعتماد ترب‌فون.",
};

type SearchParams = Promise<{ search?: string; page?: string }>;

export default async function StoresPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = safeSearch(params.search);
  const page = parsePositivePage(params.page);

  let stores;
  try {
    stores = await storesApi.list({
      page,
      pageSize: STORE_PAGE_SIZE,
      ...(search ? { search } : {}),
    });
  } catch {
    stores = null;
  }

  if (!stores) {
    return (
      <main id="main-content">
        <Container className="grid min-h-[55vh] place-items-center py-16">
          <ErrorState
            title="فهرست فروشگاه‌ها بارگذاری نشد"
            description="ارتباط با اطلاعات عمومی فروشگاه برقرار نشد. کمی بعد دوباره تلاش کنید."
          />
        </Container>
      </main>
    );
  }

  const outOfRange = stores.count > 0 && stores.results.length === 0;
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">شبکهٔ فروشندگان</p>
          <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">فروشگاه‌های فعال</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            فروشنده‌ها را جست‌وجو کنید و پیشنهادهای به‌روز هر فروشگاه را ببینید.
          </p>
        </div>
        <div className="mb-8 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:p-5">
          <StoreSearch value={search} />
        </div>
        {outOfRange ? (
          <EmptyState
            title="این صفحه وجود ندارد"
            description="به صفحهٔ اول برگردید تا فروشگاه‌های فعال را ببینید."
            action={
              <Link
                href={`/stores${search ? `?search=${encodeURIComponent(search)}` : ""}`}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]"
              >
                بازگشت به صفحهٔ اول
              </Link>
            }
          />
        ) : stores.results.length === 0 ? (
          <EmptyState
            title={search ? "فروشگاهی پیدا نشد" : "هنوز فروشگاه فعالی ثبت نشده است"}
            description={
              search
                ? `برای «${search}» نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کنید.`
                : "به‌زودی فروشگاه‌های فعال اینجا نمایش داده می‌شوند."
            }
            action={
              search ? (
                <Link
                  href="/stores"
                  className="text-sm font-semibold text-[var(--accent-radish)] underline"
                >
                  نمایش همهٔ فروشگاه‌ها
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              <span dir="ltr">{stores.count}</span> فروشگاه فعال
              {search ? ` برای «${search}»` : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.results.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={STORE_PAGE_SIZE}
              total={stores.count}
              search={search}
              basePath="/stores"
            />
          </>
        )}
      </Container>
    </main>
  );
}
