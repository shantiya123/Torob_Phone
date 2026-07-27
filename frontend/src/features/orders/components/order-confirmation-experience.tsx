"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Badge, Container, Panel, Skeleton } from "@/components/ui";
import { readCheckoutHandoff } from "@/features/checkout/lib/checkout-handoff";
import { getOrderStatusPresentation } from "@/features/orders/lib/order-status";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { CheckoutResponse } from "@/types/api";

const SAFE_CHECKOUT_ID = /^[A-Za-z0-9_-]{1,128}$/;

type ConfirmationState =
  | { status: "loading" }
  | { status: "recovery"; reason: "missing_id" | "invalid_id" | "missing_handoff" }
  | { status: "success"; result: CheckoutResponse };

function ConfirmationLoading() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="grid gap-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-44" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </Container>
  );
}

function RecoveryState({ reason }: { reason: "missing_id" | "invalid_id" | "missing_handoff" }) {
  const detail =
    reason === "missing_id"
      ? "شناسه امن این تسویه در نشانی صفحه وجود ندارد."
      : reason === "invalid_id"
        ? "شناسه تسویه موجود در نشانی صفحه معتبر نیست."
        : "اطلاعات تأیید این خرید در نشست فعلی مرورگر در دسترس نیست یا قابل اعتبارسنجی نیست.";

  return (
    <Container className="py-10">
      <Panel className="mx-auto grid max-w-2xl justify-items-center gap-5 text-center">
        <p className="m-0 text-sm font-semibold text-[var(--status-warning)]">نیاز به بررسی سفارش‌ها</p>
        <h1 className="m-0 text-3xl font-black">جزئیات تأیید خرید در دسترس نیست</h1>
        <p className="m-0 max-w-prose leading-7 text-[var(--text-secondary)]">
          {detail} این وضعیت به‌تنهایی موفق یا ناموفق بودن خرید را مشخص نمی‌کند. برای دیدن سفارش‌های ثبت‌شده، تاریخچه سفارش‌ها را بررسی کنید.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            مشاهده تاریخچه سفارش‌ها
          </Link>
          <Link
            href="/torobche"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            ادامه جست‌وجوی گوشی
          </Link>
        </div>
      </Panel>
    </Container>
  );
}

export function OrderConfirmationExperience() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkoutId");
  const [state, setState] = useState<ConfirmationState>({ status: "loading" });

  useEffect(() => {
    if (!checkoutId) {
      setState({ status: "recovery", reason: "missing_id" });
      return;
    }
    if (!SAFE_CHECKOUT_ID.test(checkoutId)) {
      setState({ status: "recovery", reason: "invalid_id" });
      return;
    }

    const result = readCheckoutHandoff(checkoutId);
    if (!result || result.checkout_id !== checkoutId) {
      setState({ status: "recovery", reason: "missing_handoff" });
      return;
    }
    setState({ status: "success", result });
  }, [checkoutId]);

  if (state.status === "loading") return <ConfirmationLoading />;
  if (state.status === "recovery") return <RecoveryState reason={state.reason} />;

  const { result } = state;
  return (
    <Container className="py-8 sm:py-10">
      <div className="grid gap-6">
        <header
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-panel)] border border-[var(--status-success)]/40 bg-[var(--surface-secondary)] p-6 sm:p-8"
        >
          <p className="m-0 text-sm font-semibold text-[var(--status-success)]">خرید با موفقیت تأیید شد</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">سفارش‌های شما ثبت شدند</h1>
          <p className="mb-0 mt-3 max-w-3xl leading-7 text-[var(--text-secondary)]">
            سرور خرید را تأیید کرده و {formatNumber(result.order_count)} سفارش فروشگاهی ایجاد شده است. جزئیات هر سفارش را جداگانه می‌توانید بررسی کنید.
          </p>
        </header>

        <section aria-labelledby="checkout-summary-title">
          <Panel className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="m-0 text-sm text-[var(--text-muted)]">مرجع تسویه</p>
                <h2 id="checkout-summary-title" className="mt-1 text-xl font-bold">شناسه {result.checkout_id}</h2>
              </div>
              <Badge tone="success">تأییدشده</Badge>
            </div>
            <dl className="m-0 grid gap-4 sm:grid-cols-3">
              <div><dt className="text-sm text-[var(--text-muted)]">تعداد سفارش‌ها</dt><dd className="m-0 mt-1 font-bold">{formatNumber(result.order_count)}</dd></div>
              <div><dt className="text-sm text-[var(--text-muted)]">مبلغ قطعی خرید</dt><dd className="m-0 mt-1 font-bold">{formatPrice(result.total)}</dd></div>
              <div><dt className="text-sm text-[var(--text-muted)]">موجودی نهایی کیف پول</dt><dd className="m-0 mt-1 font-bold">{formatPrice(result.wallet_balance)}</dd></div>
            </dl>
          </Panel>
        </section>

        <section aria-labelledby="confirmed-orders-title" className="grid gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">سفارش‌های ایجادشده</p>
            <h2 id="confirmed-orders-title" className="mt-2 text-2xl font-black">جزئیات سفارش‌های فروشگاهی</h2>
          </div>
          {result.orders.length !== result.order_count ? (
            <Alert tone="warning" title="اختلاف در خلاصه پاسخ">
              تعداد سفارش‌های قابل نمایش با شمارش اعلام‌شده یکسان نیست. برای بررسی کامل، تاریخچه سفارش‌ها را باز کنید.
            </Alert>
          ) : null}
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
            {result.orders.map((order) => {
              const status = getOrderStatusPresentation(order.status);
              return (
                <li key={order.id}>
                  <Panel className="flex h-full flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="m-0 text-sm text-[var(--text-muted)]">سفارش شماره {formatNumber(order.id)}</p>
                        <h3 className="mt-1 text-xl font-bold">{order.store.name}</h3>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <dl className="m-0 grid gap-3 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">تعداد اقلام</dt><dd className="m-0 font-semibold">{formatNumber(order.item_count)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">مبلغ سفارش</dt><dd className="m-0 font-semibold">{formatPrice(order.total)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">تاریخ ثبت</dt><dd className="m-0 font-semibold">{formatDate(order.created_at)}</dd></div>
                    </dl>
                    <div className="mt-auto flex flex-col gap-3 sm:flex-row">
                      <Link
                        href={`/orders/${order.id}`}
                        aria-label={`مشاهده جزئیات سفارش ${formatNumber(order.id)} از فروشگاه ${order.store.name}`}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 font-semibold text-[var(--text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      >
                        مشاهده جزئیات سفارش
                      </Link>
                      <Link
                        href={`/stores/${order.store.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      >
                        مشاهده فروشگاه
                      </Link>
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ul>
        </section>

        <nav aria-label="اقدام‌های بعد از خرید" className="flex flex-col gap-3 sm:flex-row">
          <Link href="/orders" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-bold text-[var(--text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">مشاهده تاریخچه سفارش‌ها</Link>
          <Link href="/torobche" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-5 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">ادامه جست‌وجوی گوشی</Link>
        </nav>
      </div>
    </Container>
  );
}
