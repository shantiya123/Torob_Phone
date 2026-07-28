"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicOffer } from "@/types/api";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PriceDisplay,
  Radio,
} from "@/components/ui";
import { StoreLogo } from "@/features/home/components/store-logo";
import { basketApi } from "@/lib/api/basket";
import { getPersianErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/features/auth/context/auth-context";

export function OfferComparison({
  offers,
  variantId,
  highlightLowest = true,
}: {
  offers: PublicOffer[];
  variantId: number;
  highlightLowest?: boolean;
}) {
  const { status, user } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(offers[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );
  const effectiveSelectedId = offers.some((offer) => offer.id === selectedId)
    ? selectedId
    : (offers[0]?.id ?? null);
  const selected = offers.find((offer) => offer.id === effectiveSelectedId) ?? null;
  const safeQuantity = selected ? Math.min(selected.quantity, Math.max(1, quantity)) : 1;

  function selectOffer(id: number) {
    setSelectedId(id);
    setQuantity(1);
    setFeedback(null);
  }

  async function addToBasket() {
    if (!selected || pending) return;
    if (status !== "authenticated") {
      window.location.assign(`/login?next=${encodeURIComponent(`/phones/${variantId}`)}`);
      return;
    }
    if (user?.role !== "customer") {
      setFeedback({ tone: "danger", text: "حساب‌های فروشگاه و کارکنان امکان خرید ندارند." });
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      await basketApi.add(selected.id, safeQuantity);
      setFeedback({ tone: "success", text: "این پیشنهاد به سبد خرید اضافه شد." });
    } catch (error) {
      setFeedback({ tone: "danger", text: getPersianErrorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  if (!offers.length) return null;
  const lowestId = highlightLowest ? offers[0]?.id : null;
  return (
    <section aria-labelledby="comparison-heading" className="mt-8">
      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">مقایسهٔ فروشگاه‌ها</p>
        <h2 id="comparison-heading" className="m-0 text-2xl font-bold">
          پیشنهادهای فعلی
        </h2>
      </div>
      <div role="radiogroup" aria-label="انتخاب پیشنهاد" className="grid gap-4">
        {offers.map((offer) => {
          const checked = effectiveSelectedId === offer.id;
          return (
            <Card
              key={offer.id}
              className={`transition-colors ${checked ? "border-[var(--accent-radish)] ring-2 ring-[var(--accent-radish)]/30" : ""}`}
            >
              <label className="flex cursor-pointer gap-4 p-4 sm:p-5">
                <Radio
                  name="selected-offer"
                  value={offer.id}
                  checked={checked}
                  onChange={() => selectOffer(offer.id)}
                  aria-label={`انتخاب پیشنهاد ${offer.store.name}`}
                  className="mt-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <StoreLogo src={offer.store.logo} name={offer.store.name} />
                      <div>
                        <h3 className="m-0 font-bold">{offer.store.name}</h3>
                        <Link
                          href={`/stores/${offer.store.id}`}
                          className="text-sm text-[var(--text-muted)]"
                        >
                          مشاهدهٔ فروشگاه
                        </Link>
                      </div>
                    </div>
                    <div className="text-end">
                      <PriceDisplay value={offer.price} />
                      {offer.id === lowestId && <Badge tone="success">کمترین قیمت فعلی</Badge>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <Badge tone={offer.available ? "success" : "warning"}>
                      {offer.available ? "موجود" : "ناموجود"}
                    </Badge>
                    <span>موجودی فروشگاه: <bdi dir="ltr">{offer.quantity}</bdi></span>
                    {offer.description && <span className="line-clamp-2">{offer.description}</span>}
                  </div>
                </div>
              </label>
            </Card>
          );
        })}
      </div>
      {selected && (
        <Card className="mt-5 border-[var(--border-strong)]">
          <CardHeader>
            <CardTitle>انتخاب تعداد و افزودن به سبد</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="m-0 text-sm text-[var(--text-muted)]">
              پس از افزودن به سبد، موجودی برای مدت محدودی رزرو می‌شود.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <label className="grid gap-2 text-sm font-semibold" htmlFor="offer-quantity">
                تعداد
                <input
                  id="offer-quantity"
                  type="number"
                  min={1}
                  max={selected.quantity}
                  step={1}
                  value={safeQuantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.min(selected.quantity, Math.max(1, Number(event.target.value) || 1)),
                    )
                  }
                  className="min-h-11 w-28 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-center"
                />
              </label>
              <button
                type="button"
                onClick={() => void addToBasket()}
                disabled={pending || !selected.available || selected.quantity < 1}
                className="min-h-11 rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)] disabled:opacity-60"
              >
                {pending
                  ? "در حال افزودن…"
                  : status === "authenticated"
                    ? "افزودن به سبد"
                    : "ورود برای خرید"}
              </button>
            </div>
            {feedback && (
              <p
                role={feedback.tone === "danger" ? "alert" : "status"}
                className={
                  feedback.tone === "danger"
                    ? "m-0 text-sm text-[var(--status-danger)]"
                    : "m-0 text-sm text-[var(--status-success)]"
                }
              >
                {feedback.text}
                {feedback.tone === "success" && (
                  <>
                    {" "}
                    <Link href="/basket" className="font-semibold underline">
                      مشاهدهٔ سبد
                    </Link>
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
