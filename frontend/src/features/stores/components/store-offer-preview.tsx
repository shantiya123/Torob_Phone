"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container, EmptyState, ErrorState } from "@/components/ui";
import type { PublicOffer, PublicStoreDetail } from "@/types/api";
import { OfferCard } from "./offer-card";

export function StoreOfferPreview({
  store,
  offers,
  failed = false,
}: {
  store: Pick<PublicStoreDetail, "id" | "name">;
  offers: readonly PublicOffer[];
  failed?: boolean;
}) {
  const router = useRouter();
  const previewOffers = offers.slice(0, 5);

  return (
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
          aria-label={`مشاهده همه پیشنهادهای فروشگاه ${store.name}`}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm font-semibold transition-[background-color,border-color] duration-[var(--duration-fast)] hover:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]"
        >
          مشاهدهٔ همهٔ پیشنهادها
        </Link>
      </div>

      {failed ? (
        <ErrorState
          title="پیشنهادها بارگذاری نشدند"
          description="اطلاعات فروشگاه در دسترس است؛ برای دریافت دوبارهٔ پیشنهادها تلاش کنید."
          onRetry={() => router.refresh()}
        />
      ) : previewOffers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {previewOffers.map((offer) => (
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
  );
}
