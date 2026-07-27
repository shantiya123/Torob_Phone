"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Container, EmptyState, ErrorState, Panel, Skeleton } from "@/components/ui";
import { basketApi } from "@/lib/api/basket";
import { ApiError, getErrorForField, getPersianErrorMessage } from "@/lib/api/errors";
import { walletApi } from "@/lib/api/wallet";
import { formatNumber, formatPrice } from "@/lib/format";
import type { Basket, BasketItem, Wallet } from "@/types/api";

function mutationMessage(error: unknown): string {
  if (error instanceof ApiError && error.backendCode === "basket_reservation_expired")
    return "زمان رزرو این کالا تمام شده است. سبد خرید دوباره بررسی شد.";
  return getErrorForField(error, "quantity") ?? getPersianErrorMessage(error);
}

function ReservationStatus({ item }: { item: BasketItem }) {
  const [remaining, setRemaining] = useState(item.remaining_seconds);
  useEffect(() => {
    setRemaining(item.remaining_seconds);
    if (item.remaining_seconds <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [item.remaining_seconds, item.expires_at]);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return (
    <p className="m-0 text-sm text-[var(--text-muted)]" aria-label={`زمان باقی‌مانده رزرو ${minutes} دقیقه و ${seconds} ثانیه`}>
      {remaining > 0 ? `رزرو موقت: ${formatNumber(minutes)}:${formatNumber(seconds).padStart(2, "۰")}` : "رزرو منقضی شده"}
    </p>
  );
}

function BasketItemCard({
  item,
  pending,
  error,
  onQuantity,
  onRemove,
}: {
  item: BasketItem;
  pending: boolean;
  error?: string;
  onQuantity: (item: BasketItem, quantity: number) => void;
  onRemove: (item: BasketItem) => void;
}) {
  const variant = item.offer.device_variant;
  const blocked = !item.offer.available || !variant.is_available || item.remaining_seconds <= 0;
  return (
    <li>
      <Panel className="grid gap-5 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-start">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-interactive)]">
          {variant.image_url ? (
            <Image src={variant.image_url} alt={`${variant.brand} ${variant.model_name}`} fill className="object-contain p-2" sizes="112px" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-[var(--text-muted)]">بدون تصویر</div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <Link href={`/phones/${variant.id}`} className="font-bold hover:text-[var(--accent-radish)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
              {variant.brand} {variant.model_name}
            </Link>
            <p className="m-0 mt-1 text-sm text-[var(--text-secondary)]">
              رم {variant.ram_gb == null ? "نامشخص" : `${formatNumber(variant.ram_gb)} گیگابایت`} · حافظه {variant.storage_gb == null ? "نامشخص" : `${formatNumber(variant.storage_gb)} گیگابایت`}
              {variant.storage_technology ? ` · ${variant.storage_technology}` : ""}
            </p>
          </div>
          <Link href={`/stores/${item.offer.store.id}`} className="inline-flex text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            فروشگاه {item.offer.store.name}
          </Link>
          {item.offer.description ? <p className="m-0 text-sm leading-6 text-[var(--text-muted)]">{item.offer.description}</p> : null}
          <ReservationStatus item={item} />
          {blocked ? <p role="status" className="m-0 text-sm font-semibold text-[var(--status-danger)]">این مورد فعلاً برای ادامه خرید در دسترس نیست.</p> : null}
          {error ? <p role="alert" className="m-0 text-sm text-[var(--status-danger)]">{error}</p> : null}
        </div>
        <div className="grid min-w-[180px] gap-3 md:justify-items-end">
          <div className="text-sm text-[var(--text-secondary)]">قیمت رزروشده: {formatPrice(item.unit_price)}</div>
          <div className="text-lg font-bold">جمع ردیف: {formatPrice(item.total)}</div>
          <div className="flex items-center gap-2" aria-label={`تعداد ${variant.brand} ${variant.model_name}`}>
            <Button size="icon" variant="secondary" aria-label="کاهش تعداد" disabled={pending || item.quantity <= 1} onClick={() => onQuantity(item, item.quantity - 1)}>−</Button>
            <output className="min-w-10 text-center font-bold" aria-live="polite">{formatNumber(item.quantity)}</output>
            <Button size="icon" variant="secondary" aria-label="افزایش تعداد" disabled={pending || blocked} onClick={() => onQuantity(item, item.quantity + 1)}>+</Button>
          </div>
          <Button variant="ghost" loading={pending} disabled={pending} onClick={() => onRemove(item)} aria-label={`حذف ${variant.brand} ${variant.model_name} از سبد`}>
            حذف از سبد
          </Button>
        </div>
      </Panel>
    </li>
  );
}

function BasketLoading() {
  return <Container className="py-10"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="grid gap-4">{[1,2].map((i)=><Skeleton key={i} className="h-64" />)}</div><Skeleton className="h-72" /></div></Container>;
}

export function BasketExperience() {
  const [basket, setBasket] = useState<Basket | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [basketError, setBasketError] = useState<unknown>(null);
  const [walletError, setWalletError] = useState<unknown>(null);
  const [pendingItem, setPendingItem] = useState<number | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const loadBasket = useCallback(async () => {
    setBasketError(null);
    try { setBasket(await basketApi.get()); } catch (error) { setBasketError(error); }
  }, []);
  const loadWallet = useCallback(async () => {
    setWalletError(null);
    try { setWallet(await walletApi.get()); } catch (error) { setWalletError(error); }
  }, []);
  useEffect(() => { void Promise.allSettled([loadBasket(), loadWallet()]).finally(() => setLoading(false)); }, [loadBasket, loadWallet]);

  const mutateQuantity = async (item: BasketItem, quantity: number) => {
    setPendingItem(item.id); setItemErrors((v) => ({...v, [item.id]: ""})); setNotice(null);
    try {
      await basketApi.update(item.id, quantity);
      await loadBasket();
      setNotice("تعداد کالا با تأیید سرور به‌روزرسانی شد.");
    } catch (error) {
      setItemErrors((v) => ({...v, [item.id]: mutationMessage(error)}));
      if (error instanceof ApiError && error.backendCode === "basket_reservation_expired") await loadBasket();
    } finally { setPendingItem(null); }
  };
  const removeItem = async (item: BasketItem) => {
    setPendingItem(item.id); setItemErrors((v) => ({...v, [item.id]: ""})); setNotice(null);
    try { await basketApi.remove(item.id); await loadBasket(); setNotice("کالا پس از تأیید سرور از سبد حذف شد."); }
    catch (error) { setItemErrors((v) => ({...v, [item.id]: mutationMessage(error)})); }
    finally { setPendingItem(null); }
  };

  const hasBlockingItem = useMemo(() => basket?.items.some((item) => !item.offer.available || !item.offer.device_variant.is_available || item.remaining_seconds <= 0) ?? false, [basket]);
  if (loading) return <BasketLoading />;
  if (basketError || !basket) return <Container className="py-10"><ErrorState title="سبد خرید در دسترس نیست" description={getPersianErrorMessage(basketError)} onRetry={() => void loadBasket()} /></Container>;
  if (basket.items.length === 0) return <Container className="py-10"><EmptyState title="سبد خرید خالی است" description="برای پیدا کردن گوشی مناسب، جست‌وجوی هوشمند تربچه را شروع کنید." action={<Link className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 font-semibold text-[var(--text-inverse)]" href="/torobche">رفتن به تربچه</Link>} /></Container>;

  const walletInsufficient = wallet ? wallet.balance < basket.total : false;
  const checkoutBlocked = hasBlockingItem || walletInsufficient;
  return (
    <Container className="py-8 sm:py-10">
      <header className="mb-8"><p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">خرید مشتری</p><h1 className="m-0 text-3xl font-black sm:text-4xl">سبد خرید</h1><p className="mt-3 text-[var(--text-secondary)]">موجودی کالاها موقتاً رزرو شده و تأیید نهایی در مرحله پرداخت انجام می‌شود.</p></header>
      {notice ? <p role="status" aria-live="polite" className="mb-4 rounded-[var(--radius-control)] border border-[var(--status-success)]/40 p-3 text-sm">{notice}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <ul className="m-0 grid list-none gap-4 p-0">{basket.items.map((item)=><BasketItemCard key={item.id} item={item} pending={pendingItem===item.id} {...(itemErrors[item.id] ? { error: itemErrors[item.id] } : {})} onQuantity={mutateQuantity} onRemove={removeItem} />)}</ul>
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Panel className="grid gap-4"><h2 className="m-0 text-xl font-bold">خلاصه قیمت</h2><div className="flex justify-between gap-3"><span>جمع سبد</span><strong>{formatPrice(basket.total)}</strong></div><p className="m-0 text-xs leading-5 text-[var(--text-muted)]">مبلغ نهایی از پاسخ فعلی Django نمایش داده شده است.</p></Panel>
          <Panel className="grid gap-3"><h2 className="m-0 text-xl font-bold">کیف پول</h2>{walletError ? <ErrorState title="موجودی کیف پول دریافت نشد" description="سبد خرید همچنان قابل ویرایش است." onRetry={() => void loadWallet()} /> : wallet ? <><div className="flex justify-between gap-3"><span>موجودی</span><strong>{formatPrice(wallet.balance)}</strong></div>{walletInsufficient ? <><p className="m-0 text-sm text-[var(--status-danger)]">موجودی کیف پول برای مبلغ فعلی سبد کافی نیست.</p><Link className="font-semibold text-[var(--accent-radish)]" href="/wallet">افزایش موجودی کیف پول</Link></> : <p className="m-0 text-sm text-[var(--text-muted)]">موجودی نمایش‌داده‌شده کافی به نظر می‌رسد؛ تأیید نهایی در Checkout انجام می‌شود.</p>}</> : null}</Panel>
          {checkoutBlocked ? <p className="m-0 text-sm text-[var(--status-danger)]">برای ادامه، مشکل موجودی یا رزرو سبد را برطرف کنید.</p> : null}
          <Link aria-disabled={checkoutBlocked} tabIndex={checkoutBlocked ? -1 : 0} href={checkoutBlocked ? "#" : "/checkout"} className={`inline-flex min-h-[52px] items-center justify-center rounded-[var(--radius-control)] px-5 text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${checkoutBlocked ? "pointer-events-none opacity-50 bg-[var(--surface-interactive)]" : "bg-[var(--accent-radish)] text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)]"}`}>ادامه برای پرداخت</Link>
        </aside>
      </div>
    </Container>
  );
}
