"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Container, DateDisplay, EmptyState, ErrorState, PriceDisplay, Skeleton } from "@/components/ui";
import { ordersApi } from "@/lib/api/orders";
import type { ApiError } from "@/lib/api";
import type { PaginatedResponse, OrderSummary } from "@/types/api";
import { getOrderStatusPresentation } from "@/features/orders/lib/order-status";

const PAGE_SIZE = 20;

type LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: PaginatedResponse<OrderSummary>; error: null }
  | { status: "error"; data: null; error: unknown };

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function pageHref(pathname: string, page: number) {
  return page === 1 ? pathname : `${pathname}?page=${page}`;
}

function OrderCard({ order }: { order: OrderSummary }) {
  const status = getOrderStatusPresentation(order.status);
  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-level-1)] transition-[border-color,transform] duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] motion-reduce:transform-none sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm text-[var(--text-muted)]">سفارش شماره <span dir="ltr">{order.id}</span></p>
          <Link href={`/stores/${order.store.id}`} className="mt-2 block break-words text-lg font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            {order.store.name}
          </Link>
        </div>
        <span className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-sm font-semibold" data-tone={status.tone}>
          {status.label}
        </span>
      </div>
      <dl className="mt-6 grid gap-4 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-3">
        <div><dt className="text-xs text-[var(--text-muted)]">تعداد کالا</dt><dd className="mt-1 font-semibold"><span dir="ltr">{order.item_count}</span></dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">مبلغ سفارش</dt><dd className="mt-1 font-bold"><PriceDisplay value={order.total} /></dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">زمان ثبت</dt><dd className="mt-1 text-sm"><DateDisplay value={order.created_at} /></dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-[var(--text-muted)]">آخرین به‌روزرسانی: <DateDisplay value={order.updated_at} /></p>
        <Link href={`/orders/${order.id}`} aria-label={`مشاهده جزئیات سفارش ${order.id} از فروشگاه ${order.store.name}`} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          مشاهده جزئیات سفارش
        </Link>
      </div>
    </li>
  );
}

export function OrderHistoryExperience() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);
  const [state, setState] = useState<LoadState>({ status: "loading", data: null, error: null });

  const load = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await ordersApi.list({ page, pageSize: PAGE_SIZE });
      setState({ status: "ready", data, error: null });
    } catch (error) {
      setState({ status: "error", data: null, error });
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") {
    return <main id="main-content"><Container className="py-10 sm:py-14"><Skeleton className="h-10 w-64" /><div className="mt-10 grid gap-4 lg:grid-cols-2">{[0,1,2,3].map((x)=><Skeleton key={x} className="h-64" />)}</div></Container></main>;
  }

  if (state.status === "error") {
    const invalid = (state.error as ApiError)?.code === "invalid_response";
    return <main id="main-content"><Container className="grid min-h-[55vh] place-items-center py-16"><ErrorState title={invalid ? "پاسخ تاریخچه سفارش‌ها معتبر نبود" : "تاریخچه سفارش‌ها بارگذاری نشد"} description={invalid ? "برای محافظت از اطلاعات مالی، دادهٔ تأییدنشده نمایش داده نمی‌شود." : "ارتباط با سفارش‌های شما برقرار نشد. دوباره تلاش کنید."} onRetry={() => void load()} /></Container></main>;
  }

  const { data } = state;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const outOfRange = data.count > 0 && data.results.length === 0;
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">سوابق خرید</p>
            <h1 className="m-0 text-3xl font-bold sm:text-4xl">سفارش‌های من</h1>
            <p className="mt-4 leading-8 text-[var(--text-secondary)]">هر سفارش فروشگاه به‌صورت مستقل و با مبلغ و وضعیت تاریخی ثبت‌شده نمایش داده می‌شود.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">تازه‌سازی تاریخچه</button>
        </header>

        {outOfRange ? (
          <EmptyState title="این صفحه از سفارش‌ها وجود ندارد" description="برای مشاهده سفارش‌های ثبت‌شده به صفحه اول برگردید." action={<Link href="/orders" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]">بازگشت به صفحه اول</Link>} />
        ) : data.results.length === 0 ? (
          <div className="mt-10"><EmptyState title="هنوز سفارشی ثبت نکرده‌اید" description="پس از خرید موفق، سفارش‌های هر فروشگاه در این بخش نمایش داده می‌شوند." action={<Link href="/torobche" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]">جست‌وجوی گوشی</Link>} /></div>
        ) : (
          <>
            <p className="mb-4 mt-10 text-sm text-[var(--text-muted)]"><span dir="ltr">{data.count}</span> سفارش ثبت‌شده</p>
            <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">{data.results.map((order) => <OrderCard key={order.id} order={order} />)}</ul>
            {totalPages > 1 && (
              <nav aria-label="صفحه‌بندی سفارش‌ها" className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {page > 1 ? <Link href={pageHref(pathname, page - 1)} aria-label="صفحه قبلی سفارش‌ها" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 hover:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">→ قبلی</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">→ قبلی</span>}
                <span aria-current="page" className="text-sm text-[var(--text-secondary)]">صفحه <span dir="ltr">{page}</span> از <span dir="ltr">{totalPages}</span></span>
                {page < totalPages ? <Link href={pageHref(pathname, page + 1)} aria-label="صفحه بعدی سفارش‌ها" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 hover:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">بعدی ←</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">بعدی ←</span>}
              </nav>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
