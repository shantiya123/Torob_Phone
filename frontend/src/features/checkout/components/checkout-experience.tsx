"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Container, EmptyState, ErrorState, Panel, Skeleton } from "@/components/ui";
import { basketApi } from "@/lib/api/basket";
import { ApiError, getPersianErrorMessage } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { walletApi } from "@/lib/api/wallet";
import { formatNumber, formatPrice } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import type { Basket, BasketItem, Wallet } from "@/types/api";
import { storeCheckoutHandoff } from "@/features/checkout/lib/checkout-handoff";

type SubmitState = "idle" | "pending" | "uncertain" | "failed" | "success";

function checkoutMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "خطایی غیرمنتظره رخ داد. دوباره تلاش کنید.";
  switch (error.backendCode) {
    case "basket_empty": return "سبد خرید خالی است و سفارشی ایجاد نشد.";
    case "insufficient_wallet_balance": return "موجودی کیف پول برای این خرید کافی نیست. هیچ سفارشی ایجاد نشد.";
    case "basket_reservation_expired": return "زمان رزرو یک یا چند کالا تمام شده است. سبد خرید دوباره بررسی شد و سفارشی ایجاد نشد.";
    default:
      if (error.code === "invalid_response") return "نتیجه خرید از سرور دریافت شد، اما تأیید آن ممکن نیست. برای بررسی امن، همان تلاش را دوباره ارسال کنید.";
      if (["network_error", "timeout", "server_error"].includes(error.code)) return "نتیجه این تلاش هنوز مشخص نیست. برای جلوگیری از خرید تکراری، فقط از دکمه «بررسی دوباره همین تلاش» استفاده کنید.";
      return getPersianErrorMessage(error);
  }
}

function CheckoutItem({ item }: { item: BasketItem }) {
  const variant = item.offer.device_variant;
  const source = resolveMediaUrl(variant.image_url);
  return (
    <li className="grid gap-4 border-t border-[var(--border-subtle)] py-5 first:border-t-0 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-start">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-interactive)]">
        {source ? <Image unoptimized src={source} alt={`${variant.brand} ${variant.model_name}`} fill sizes="88px" className="object-contain p-2" /> : <div className="grid h-full place-items-center text-xs text-[var(--text-muted)]">بدون تصویر</div>}
      </div>
      <div className="min-w-0 space-y-2">
        <Link href={`/phones/${variant.id}`} className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">{variant.brand} {variant.model_name}</Link>
        <p className="m-0 text-sm text-[var(--text-secondary)]">رم {variant.ram_gb == null ? "نامشخص" : `${formatNumber(variant.ram_gb)} گیگابایت`} · حافظه {variant.storage_gb == null ? "نامشخص" : `${formatNumber(variant.storage_gb)} گیگابایت`}{variant.storage_technology ? ` · ${variant.storage_technology}` : ""}</p>
        {item.offer.description ? <p className="m-0 text-sm leading-6 text-[var(--text-muted)]">{item.offer.description}</p> : null}
        <p className="m-0 text-sm text-[var(--text-muted)]">تعداد رزروشده: {formatNumber(item.quantity)} · قیمت واحد رزروشده: {formatPrice(item.unit_price)}</p>
        <p className="m-0 text-xs text-[var(--text-muted)]">زمان باقی‌مانده رزرو: {formatNumber(Math.max(0, Math.ceil(item.remaining_seconds / 60)))} دقیقه</p>
      </div>
      <strong className="whitespace-nowrap sm:text-left">{formatPrice(item.total)}</strong>
    </li>
  );
}

function LoadingState() {
  return <Container className="py-10"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="grid gap-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div><Skeleton className="h-96" /></div></Container>;
}

export function CheckoutExperience() {
  const router = useRouter();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [basketError, setBasketError] = useState<unknown>(null);
  const [walletError, setWalletError] = useState<unknown>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const attemptKey = useRef<string | null>(null);
  const submitting = useRef(false);

  const loadBasket = useCallback(async () => { setBasketError(null); try { setBasket(await basketApi.get()); } catch (error) { setBasketError(error); } }, []);
  const loadWallet = useCallback(async () => { setWalletError(null); try { setWallet(await walletApi.get()); } catch (error) { setWalletError(error); } }, []);
  const refreshReview = useCallback(async () => { await Promise.allSettled([loadBasket(), loadWallet()]); }, [loadBasket, loadWallet]);

  useEffect(() => { void refreshReview().finally(() => setLoading(false)); }, [refreshReview]);

  const blockingItem = useMemo(() => basket?.items.some((item) => !item.offer.available || !item.offer.device_variant.is_available || item.remaining_seconds <= 0) ?? false, [basket]);
  const insufficient = Boolean(basket && wallet && wallet.balance < basket.total);
  const canSubmit = Boolean(basket?.items.length && wallet && !walletError && !blockingItem && !insufficient && submitState !== "pending" && submitState !== "success");
  const projected = basket && wallet ? wallet.balance - basket.total : null;

  const submit = async () => {
    if (!canSubmit || submitting.current) return;
    submitting.current = true;
    setDialogOpen(false);
    setSubmitState("pending");
    setSubmitError(null);
    const key = attemptKey.current ?? crypto.randomUUID();
    attemptKey.current = key;
    try {
      const result = await ordersApi.checkout(key);
      storeCheckoutHandoff(result);
      setSubmitState("success");
      router.push(`/orders/confirmation?checkoutId=${encodeURIComponent(result.checkout_id)}`);
    } catch (error) {
      const uncertain = error instanceof ApiError && ["network_error", "timeout", "server_error", "invalid_response"].includes(error.code);
      setSubmitState(uncertain ? "uncertain" : "failed");
      setSubmitError(checkoutMessage(error));
      if (!uncertain) {
        attemptKey.current = null;
        await refreshReview();
      }
    } finally {
      submitting.current = false;
    }
  };

  if (loading) return <LoadingState />;
  if (basketError || !basket) return <Container className="py-10"><ErrorState title="اطلاعات تسویه حساب در دسترس نیست" description="سبد خرید تازه از سرور دریافت نشد و خرید امکان‌پذیر نیست." onRetry={() => void loadBasket()} /></Container>;
  if (basket.items.length === 0) return <Container className="py-10"><EmptyState title="سبدی برای تسویه وجود ندارد" description="برای ثبت سفارش، ابتدا یک یا چند کالا به سبد خرید اضافه کنید." action={<Link href="/basket" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 font-semibold text-[var(--text-inverse)]">بازگشت به سبد خرید</Link>} /></Container>;

  const grouped = basket.items.reduce<Map<number, BasketItem[]>>((groups, item) => {
    const current = groups.get(item.offer.store.id) ?? [];
    current.push(item);
    groups.set(item.offer.store.id, current);
    return groups;
  }, new Map());
  return (
    <Container className="py-8 sm:py-10">
      <header className="mb-8"><p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">بازبینی نهایی</p><h1 className="m-0 text-3xl font-black sm:text-4xl">تسویه حساب</h1><p className="mt-3 max-w-3xl text-[var(--text-secondary)]">با تأیید نهایی، Django یک یا چند سفارش فروشگاهی ایجاد می‌کند، مبلغ را از کیف پول کسر می‌کند و اقلام رزروشده را مصرف می‌کند.</p></header>
      <div aria-live="polite" className="sr-only">{submitState === "pending" ? "ثبت سفارش و پرداخت آغاز شد." : submitError ?? ""}</div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <main className="grid gap-5">
          {[...grouped.values()].map((items) => {
            const store = items[0]!.offer.store;
            return <Panel key={store.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-xl font-bold">فروشگاه {store.name}</h2><Link href={`/stores/${store.id}`} className="mt-1 inline-flex text-sm text-[var(--accent-radish)]">مشاهده فروشگاه</Link></div><span className="text-sm text-[var(--text-muted)]">{formatNumber(items.length)} ردیف</span></div><ul className="m-0 mt-4 list-none p-0">{items.map((item) => <CheckoutItem key={item.id} item={item} />)}</ul></Panel>;
          })}
          <div className="flex flex-wrap gap-3"><Link href="/basket" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 font-semibold">بازگشت و ویرایش سبد</Link><Button variant="secondary" onClick={() => void refreshReview()}>دریافت دوباره اطلاعات</Button></div>
        </main>
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Panel className="grid gap-4"><h2 className="m-0 text-xl font-bold">خلاصه نهایی</h2><div className="flex justify-between gap-3"><span>مبلغ سبد</span><strong>{formatPrice(basket.total)}</strong></div><p className="m-0 text-xs leading-5 text-[var(--text-muted)]">این مبلغ مستقیماً از آخرین پاسخ سبد Django نمایش داده شده است.</p></Panel>
          <Panel className="grid gap-3"><h2 className="m-0 text-xl font-bold">پرداخت از کیف پول</h2>{walletError || !wallet ? <ErrorState title="موجودی کیف پول مشخص نیست" description="تا دریافت موجودی معتبر، ثبت خرید غیرفعال است." onRetry={() => void loadWallet()} /> : <><div className="flex justify-between gap-3"><span>موجودی فعلی</span><strong>{formatPrice(wallet.balance)}</strong></div><div className="flex justify-between gap-3 text-sm"><span>مانده احتمالی پس از خرید</span><span>{formatPrice(Math.max(0, projected ?? 0))}</span></div>{insufficient ? <><p role="alert" className="m-0 text-sm font-semibold text-[var(--status-danger)]">موجودی کیف پول برای مبلغ فعلی کافی نیست.</p><Link href="/wallet" className="font-semibold text-[var(--accent-radish)]">رفتن به کیف پول</Link></> : <p className="m-0 text-sm text-[var(--text-muted)]">موجودی و شرایط خرید هنگام تأیید دوباره توسط Django بررسی می‌شود.</p>}</>}</Panel>
          {blockingItem ? <p role="alert" className="m-0 rounded-[var(--radius-control)] border border-[var(--status-danger)]/40 p-3 text-sm text-[var(--status-danger)]">یک یا چند رزرو منقضی یا غیرقابل خرید است. به سبد برگردید و آن را اصلاح کنید.</p> : null}
          {submitError ? <div role="alert" className="rounded-[var(--radius-control)] border border-[var(--status-danger)]/40 p-3 text-sm"><p className="m-0 text-[var(--status-danger)]">{submitError}</p>{submitState === "uncertain" ? <Button className="mt-3 w-full" variant="secondary" onClick={() => void submit()}>بررسی دوباره همین تلاش</Button> : null}</div> : null}
          <Button size="lg" className="w-full" disabled={!canSubmit} loading={submitState === "pending"} onClick={() => setDialogOpen(true)}>تأیید خرید و پرداخت از کیف پول</Button>
        </aside>
      </div>
      {dialogOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title" className="w-full max-w-lg rounded-[var(--radius-panel)] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-6 shadow-xl"><h2 id="checkout-confirm-title" className="m-0 text-2xl font-bold">تأیید نهایی خرید</h2><p className="mt-4 leading-7 text-[var(--text-secondary)]">مبلغ {formatPrice(basket.total)} از کیف پول کسر می‌شود و ممکن است برای فروشگاه‌های مختلف چند سفارش ایجاد شود. هنگام پردازش، اقدام را تکرار نکنید.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row"><Button variant="secondary" className="flex-1" onClick={() => setDialogOpen(false)}>انصراف</Button><Button className="flex-1" onClick={() => void submit()}>ثبت سفارش و پرداخت</Button></div></div></div> : null}
    </Container>
  );
}
