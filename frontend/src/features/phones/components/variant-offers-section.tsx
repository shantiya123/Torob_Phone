"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { Pagination } from "@/features/stores/components/pagination";
import { ApiError } from "@/lib/api/errors";
import { catalogApi } from "@/lib/api/catalog";
import type { PaginatedResponse, PublicOffer } from "@/types/api";
import { VARIANT_OFFER_PAGE_SIZE } from "@/features/phones/utils";
import { OfferComparison } from "./offer-comparison";

function OfferSectionSkeleton() {
  return (
    <div aria-label="در حال بارگذاری پیشنهادها" aria-busy="true" className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-5 sm:grid-cols-[1fr_auto]"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 shrink-0" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-28 max-w-full" />
            </div>
          </div>
          <div className="grid justify-items-end gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VariantOffersSection({
  variantId,
  page,
  ordering,
}: {
  variantId: number;
  page: number;
  ordering: "price" | "price_desc";
}) {
  const [result, setResult] = useState<PaginatedResponse<PublicOffer> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(null);

    void catalogApi
      .variantOffers(variantId, {
        page,
        pageSize: VARIANT_OFFER_PAGE_SIZE,
        ordering,
      })
      .then((response) => {
        if (!controller.signal.aborted) setResult(response);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError);
      });

    return () => controller.abort();
  }, [variantId, page, ordering, requestVersion]);

  const invalidResponse = error instanceof ApiError && error.code === "invalid_response";

  return (
    <section aria-labelledby="offers-heading" className="mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">مقایسهٔ قیمت</p>
          <h2 id="offers-heading" className="m-0 text-2xl font-bold">
            فروشگاه‌های ارائه‌دهنده
          </h2>
        </div>
        {result && result.results.length > 0 && (
          <form method="get" className="flex items-end gap-3">
            <label htmlFor="offer-ordering" className="grid gap-2 text-sm font-semibold">
              مرتب‌سازی
              <select
                id="offer-ordering"
                name="ordering"
                defaultValue={ordering}
                className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm"
              >
                <option value="price">کمترین قیمت</option>
                <option value="price_desc">بیشترین قیمت</option>
              </select>
            </label>
            <input type="hidden" name="page" value="1" />
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-interactive)] focus-visible:outline-none"
            >
              اعمال
            </button>
          </form>
        )}
      </div>

      {!result && !error ? (
        <OfferSectionSkeleton />
      ) : error ? (
        <ErrorState
          title={invalidResponse ? "پاسخ پیشنهادها معتبر نبود" : "پیشنهادها بارگذاری نشدند"}
          description={
            invalidResponse
              ? "اطلاعات مالی و فروشگاه‌ها نمایش داده نشد، چون پاسخ سرور با قرارداد عمومی پیشنهادها سازگار نبود."
              : "مشخصات گوشی در دسترس است؛ برای دریافت دوباره پیشنهادهای همین مدل تلاش کنید."
          }
          onRetry={() => setRequestVersion((version) => version + 1)}
        />
      ) : result.results.length === 0 ? (
        <EmptyState
          title="پیشنهاد فعالی وجود ندارد"
          description="در حال حاضر برای این پیکربندی دقیق، پیشنهاد فعالی از فروشگاه‌ها وجود ندارد."
          action={
            <Link href="/stores" className="font-semibold text-[var(--accent-radish)] underline">
              مشاهدهٔ فروشگاه‌ها
            </Link>
          }
        />
      ) : (
        <>
          <OfferComparison
            offers={result.results}
            variantId={variantId}
            highlightLowest={ordering === "price" && page === 1}
          />
          <Pagination
            page={page}
            pageSize={VARIANT_OFFER_PAGE_SIZE}
            total={result.count}
            query={{ ordering }}
            basePath={`/phones/${variantId}`}
          />
        </>
      )}
    </section>
  );
}
