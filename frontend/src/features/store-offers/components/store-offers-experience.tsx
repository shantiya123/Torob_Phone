"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Container, EmptyState, ErrorState, Field, FieldLabel, Input, Skeleton } from "@/components/ui";
import type { ApiError } from "@/lib/api";
import { offersApi } from "@/lib/api/offers";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import type { OperationalOffer, PaginatedResponse } from "@/types/api";

const PAGE_SIZE = 20;
type StockFilter = "available" | "out" | undefined;
type LoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: PaginatedResponse<OperationalOffer>; error: null }
  | { status: "error"; data: null; error: unknown };

function parsePage(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseStock(value: string | null): StockFilter {
  return value === "available" || value === "out" ? value : undefined;
}

function hrefFor(pathname: string, values: { page?: number; search?: string; stock?: StockFilter }) {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.stock) params.set("stock", values.stock);
  if (values.page && values.page > 1) params.set("page", String(values.page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function availabilityCopy(offer: OperationalOffer) {
  if (offer.publicly_available) return { label: "قابل نمایش عمومی", description: "این پیشنهاد اکنون در صفحات عمومی قابل مشاهده است." };
  const labels = {
    store_not_active: "فروشگاه فعال نیست",
    out_of_stock: "موجودی تمام شده است",
    variant_unavailable: "تنوع گوشی در دسترس نیست",
    device_not_catalog_eligible: "مدل گوشی شرایط نمایش در کاتالوگ را ندارد",
  } as const;
  return {
    label: "قابل نمایش عمومی نیست",
    description: offer.availability_reason ? labels[offer.availability_reason] : "وضعیت نمایش عمومی از پاسخ فعلی مشخص نیست.",
  };
}

function OfferCard({ offer }: { offer: OperationalOffer }) {
  const variant = offer.device_variant;
  const image = resolveMediaUrl(variant.image_url) ?? "/icon.svg";
  const availability = availabilityCopy(offer);
  const variantName = `${variant.brand} ${variant.model_name}`;
  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-level-1)] transition-[border-color,transform] duration-[var(--duration-standard)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] motion-reduce:transform-none sm:p-6">
      <div className="flex gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-2 sm:size-28">
          <Image unoptimized src={image} alt={`تصویر ${variantName}`} width={160} height={160} className="size-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs text-[var(--text-muted)]">پیشنهاد شماره <span dir="ltr">{offer.id}</span></p>
          <Link href={`/phones/${variant.id}`} className="mt-2 block break-words text-lg font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            {variantName}
          </Link>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            رم {variant.ram_gb === null ? "نامشخص" : `${formatNumber(variant.ram_gb)} گیگابایت`} · حافظه {variant.storage_gb === null ? "نامشخص" : `${formatNumber(variant.storage_gb)} گیگابایت`}
            {variant.storage_technology ? ` · ${variant.storage_technology}` : ""}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-3">
        <div><dt className="text-xs text-[var(--text-muted)]">قیمت</dt><dd className="m-0 mt-1 font-bold">{formatPrice(offer.price)}</dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">موجودی</dt><dd className="m-0 mt-1 font-semibold">{formatNumber(offer.quantity)} عدد</dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">آخرین تغییر</dt><dd className="m-0 mt-1 text-sm">{formatDate(offer.updated_at)}</dd></div>
      </dl>

      <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4">
        <p className="m-0 font-semibold">{availability.label}</p>
        <p className="mb-0 mt-2 text-sm leading-6 text-[var(--text-secondary)]">{availability.description}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-[var(--text-muted)]">قیمت، موجودی و توضیحات از صفحه ویرایش مدیریت می‌شوند.</p>
        <Link href={`/store/offers/${offer.id}/edit`} aria-label={`ویرایش پیشنهاد ${variantName}`} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          ویرایش پیشنهاد
        </Link>
      </div>
    </li>
  );
}

export function StoreOffersExperience() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);
  const search = searchParams.get("search")?.trim() ?? "";
  const stock = parseStock(searchParams.get("stock"));
  const [state, setState] = useState<LoadState>({ status: "loading", data: null, error: null });

  const load = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await offersApi.mine({ page, pageSize: PAGE_SIZE, ...(search ? { search } : {}), ...(stock ? { stock } : {}) });
      setState({ status: "ready", data, error: null });
    } catch (error) {
      setState({ status: "error", data: null, error });
    }
  }, [page, search, stock]);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") {
    return <main id="main-content"><Container className="py-10 sm:py-14"><Skeleton className="h-10 w-72" /><Skeleton className="mt-8 h-28" /><div className="mt-8 grid gap-4 lg:grid-cols-2">{[0,1,2,3].map((item)=><Skeleton key={item} className="h-72" />)}</div></Container></main>;
  }

  if (state.status === "error") {
    const invalid = (state.error as ApiError)?.code === "invalid_response";
    return <main id="main-content"><Container className="grid min-h-[55vh] place-items-center py-16"><ErrorState title={invalid ? "پاسخ پیشنهادهای فروشگاه معتبر نبود" : "پیشنهادهای فروشگاه بارگذاری نشد"} description={invalid ? "برای محافظت از قیمت و موجودی، دادهٔ تأییدنشده نمایش داده نمی‌شود." : "ارتباط با فضای مدیریت پیشنهادها برقرار نشد. دوباره تلاش کنید."} onRetry={() => void load()} /></Container></main>;
  }

  const { data } = state;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const outOfRange = data.count > 0 && data.results.length === 0;
  const baseValues = { search: search || undefined, stock };
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">فضای عملیاتی فروشگاه</p>
            <h1 className="m-0 text-3xl font-bold sm:text-4xl">پیشنهادهای من</h1>
            <p className="mt-4 leading-8 text-[var(--text-secondary)]">قیمت، موجودی و وضعیت نمایش عمومی پیشنهادهای متعلق به فروشگاه خودت را بررسی کن.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">تازه‌سازی</button>
            <Link href="/store/offers/new" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">ایجاد پیشنهاد فروش</Link>
          </div>
        </header>

        <form method="get" role="search" className="mt-8 grid gap-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field><FieldLabel htmlFor="offer-search">جست‌وجوی برند یا مدل</FieldLabel><Input id="offer-search" name="search" defaultValue={search} maxLength={100} placeholder="مثلاً Galaxy یا Samsung" dir="auto" /></Field>
          <Field><FieldLabel htmlFor="stock-filter">وضعیت موجودی</FieldLabel><select id="stock-filter" name="stock" defaultValue={stock ?? ""} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"><option value="">همه</option><option value="available">دارای موجودی</option><option value="out">ناموجود</option></select></Field>
          <div className="flex gap-2"><button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]">اعمال</button>{(search || stock) && <Link href={pathname} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm">پاک کردن</Link>}</div>
        </form>

        {outOfRange ? (
          <div className="mt-10"><EmptyState title="این صفحه از پیشنهادها وجود ندارد" description="برای مشاهده پیشنهادهای فروشگاه به صفحه اول برگردید." action={<Link href={hrefFor(pathname, { ...baseValues, page: 1 })} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]">بازگشت به صفحه اول</Link>} /></div>
        ) : data.results.length === 0 ? (
          <div className="mt-10"><EmptyState title={search || stock ? "پیشنهادی با این شرایط پیدا نشد" : "پیشنهاد فروشی ثبت نکرده‌ای"} description={search || stock ? "عبارت جست‌وجو یا فیلتر موجودی را تغییر بده." : "برای یک تنوع دقیق گوشی، قیمت و موجودی فروشگاه را ثبت کن."} action={<Link href="/store/offers/new" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)]">ایجاد پیشنهاد فروش</Link>} /></div>
        ) : (
          <>
            <p className="mb-4 mt-10 text-sm text-[var(--text-muted)]">{formatNumber(data.count)} پیشنهاد متعلق به فروشگاه</p>
            <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">{data.results.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</ul>
            {totalPages > 1 && <nav aria-label="صفحه‌بندی پیشنهادهای فروشگاه" className="mt-10 flex flex-wrap items-center justify-center gap-3">{page > 1 ? <Link href={hrefFor(pathname, { ...baseValues, page: page - 1 })} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">→ قبلی</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">→ قبلی</span>}<span aria-current="page" className="text-sm text-[var(--text-secondary)]">صفحه {formatNumber(page)} از {formatNumber(totalPages)}</span>{page < totalPages ? <Link href={hrefFor(pathname, { ...baseValues, page: page + 1 })} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">بعدی ←</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">بعدی ←</span>}</nav>}
          </>
        )}
      </Container>
    </main>
  );
}
