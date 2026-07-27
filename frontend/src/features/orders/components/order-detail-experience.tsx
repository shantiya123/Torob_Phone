"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, DateDisplay, ErrorState, PriceDisplay, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { ordersApi } from "@/lib/api/orders";
import { resolveMediaUrl } from "@/lib/media";
import type { Order, OrderCancellationResponse } from "@/types/api";
import { getOrderStatusPresentation } from "@/features/orders/lib/order-status";

type State = { status: "loading"; order: null; error: null } | { status: "ready"; order: Order; error: unknown | null } | { status: "error"; order: null; error: unknown };

function parseOrderId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function cancellationMessage(error: unknown) {
  if (error instanceof ApiError && error.backendCode === "order_not_cancellable") return "این سفارش با وضعیت فعلی قابل لغو نیست. اطلاعات سفارش دوباره بررسی شد.";
  if (error instanceof ApiError && error.code === "forbidden") return "اجازه لغو این سفارش را ندارید.";
  return "نتیجه لغو سفارش تأیید نشد. وضعیت سفارش دوباره از سرور بررسی می‌شود.";
}

export function OrderDetailExperience() {
  const params = useParams<{ orderId: string }>();
  const orderId = useMemo(() => parseOrderId(params.orderId), [params.orderId]);
  const [state, setState] = useState<State>({ status: "loading", order: null, error: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellationResult, setCancellationResult] = useState<OrderCancellationResponse | null>(null);
  const submittingRef = useRef(false);

  const load = useCallback(async (preserve = false) => {
    if (orderId === null) { setState({ status: "error", order: null, error: new ApiError({ code: "not_found", message: "invalid order id" }) }); return; }
    if (!preserve) setState({ status: "loading", order: null, error: null });
    try { const order = await ordersApi.detail(orderId); setState({ status: "ready", order, error: null }); }
    catch (error) { if (preserve) setState((current) => current.status === "ready" ? { ...current, error } : { status: "error", order: null, error }); else setState({ status: "error", order: null, error }); }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const cancel = async () => {
    if (orderId === null || submittingRef.current) return;
    submittingRef.current = true; setCancelling(true); setNotice("درخواست لغو سفارش در حال بررسی است.");
    try {
      const result = await ordersApi.cancel(orderId);
      setCancellationResult(result); setState({ status: "ready", order: result.order, error: null });
      setNotice(result.refund_created ? "سفارش لغو شد و بازپرداخت کیف پول توسط سرور تأیید شد." : "لغو سفارش توسط سرور تأیید شد.");
      setDialogOpen(false);
    } catch (error) {
      setNotice(cancellationMessage(error));
      await load(true);
      setDialogOpen(false);
    } finally { submittingRef.current = false; setCancelling(false); }
  };

  if (state.status === "loading") return <main id="main-content"><Container className="py-10 sm:py-14"><Skeleton className="h-10 w-64"/><Skeleton className="mt-8 h-96"/></Container></main>;
  if (state.status === "error") {
    const apiError = state.error instanceof ApiError ? state.error : null;
    const missing = apiError?.code === "not_found" || apiError?.code === "forbidden";
    const invalid = apiError?.code === "invalid_response";
    return <main id="main-content"><Container className="grid min-h-[55vh] place-items-center py-16"><ErrorState title={missing ? "سفارش در دسترس نیست" : invalid ? "پاسخ جزئیات سفارش معتبر نبود" : "جزئیات سفارش بارگذاری نشد"} description={missing ? "این سفارش پیدا نشد یا اجازه مشاهده آن را ندارید." : invalid ? "برای محافظت از اطلاعات مالی، داده تأییدنشده نمایش داده نمی‌شود." : "ارتباط با اطلاعات سفارش برقرار نشد."} onRetry={missing ? undefined : () => void load()} /></Container></main>;
  }

  const order = state.order;
  const status = getOrderStatusPresentation(order.status);
  const cancellable = order.status === "pending" || order.status === "paid";
  return <main id="main-content"><Container className="py-10 sm:py-14">
    <div className="mb-6"><Link href="/orders" className="text-sm font-semibold text-[var(--accent-radish)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">بازگشت به سفارش‌ها</Link></div>
    <header className="flex flex-wrap items-start justify-between gap-5"><div><p className="mb-2 text-sm text-[var(--text-muted)]">سفارش شماره <span dir="ltr">{order.id}</span></p><h1 className="m-0 text-3xl font-bold sm:text-4xl">جزئیات سفارش</h1></div><span className="rounded-full border border-[var(--border-strong)] px-4 py-2 font-semibold" data-tone={status.tone}>{status.label}</span></header>
    {notice && <p role="status" aria-live="polite" className="mt-6 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-secondary)] p-4 text-sm">{notice}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="items-title"><h2 id="items-title" className="text-xl font-bold">کالاهای تاریخی سفارش</h2><ul className="m-0 mt-4 grid list-none gap-4 p-0">{order.items.map((item) => { const image = resolveMediaUrl(item.variant.image_url) ?? "/icon.svg"; return <li key={item.id} className="grid gap-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:grid-cols-[8rem_minmax(0,1fr)]"><div className="aspect-square overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-secondary)]"><Image unoptimized src={image} alt={`${item.variant.brand} ${item.variant.model}`} width={256} height={256} className="size-full object-contain"/></div><div><Link href={`/phones/${item.variant.id}`} className="text-lg font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">{item.variant.brand} {item.variant.model}</Link><p className="mt-2 text-sm text-[var(--text-secondary)]">رم <span dir="ltr">{item.variant.ram_gb}</span> گیگابایت · حافظه <span dir="ltr">{item.variant.storage_gb}</span> گیگابایت · {item.variant.storage_technology}</p><dl className="mt-5 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs text-[var(--text-muted)]">تعداد</dt><dd><span dir="ltr">{item.quantity}</span></dd></div><div><dt className="text-xs text-[var(--text-muted)]">قیمت واحد تاریخی</dt><dd><PriceDisplay value={item.unit_price}/></dd></div><div><dt className="text-xs text-[var(--text-muted)]">جمع خط</dt><dd className="font-bold"><PriceDisplay value={item.line_total}/></dd></div></dl></div></li>; })}</ul></section>
      <aside className="h-fit rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 lg:sticky lg:top-24"><h2 className="text-xl font-bold">خلاصه سفارش</h2><dl className="mt-5 grid gap-4"><div><dt className="text-xs text-[var(--text-muted)]">فروشگاه</dt><dd className="mt-1"><Link href={`/stores/${order.store.id}`} className="font-bold hover:underline">{order.store.name}</Link></dd></div><div><dt className="text-xs text-[var(--text-muted)]">تعداد کالا</dt><dd><span dir="ltr">{order.item_count}</span></dd></div><div><dt className="text-xs text-[var(--text-muted)]">زمان ثبت</dt><dd><DateDisplay value={order.created_at}/></dd></div><div><dt className="text-xs text-[var(--text-muted)]">آخرین تغییر</dt><dd><DateDisplay value={order.updated_at}/></dd></div><div className="border-t border-[var(--border-subtle)] pt-4"><dt className="text-sm text-[var(--text-muted)]">مبلغ نهایی سفارش</dt><dd className="mt-2 text-xl font-bold"><PriceDisplay value={order.total}/></dd></div></dl>
      {cancellable && <button type="button" onClick={() => setDialogOpen(true)} disabled={cancelling} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--status-danger)] px-4 font-semibold text-[var(--status-danger)] disabled:opacity-60">لغو سفارش</button>}
      {cancellationResult?.refund_created && cancellationResult.refund && <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border-strong)] p-4 text-sm"><p className="m-0 font-semibold">بازپرداخت تأییدشده: <PriceDisplay value={cancellationResult.refund.amount}/></p>{cancellationResult.wallet_balance !== null && <p className="mb-0 mt-2">موجودی جدید کیف پول: <PriceDisplay value={cancellationResult.wallet_balance}/></p>}<Link href="/wallet" className="mt-3 inline-block font-semibold text-[var(--accent-radish)]">مشاهده کیف پول</Link></div>}
      </aside>
    </div>
    {dialogOpen && <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(e) => { if (e.currentTarget === e.target && !cancelling) setDialogOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--surface-primary)] p-6"><h2 id="cancel-title" className="m-0 text-xl font-bold">لغو سفارش</h2><p className="mt-4 leading-7 text-[var(--text-secondary)]">با تأیید لغو، Django وضعیت سفارش را تغییر می‌دهد، موجودی کالا را بازمی‌گرداند و برای سفارش پرداخت‌شده بازپرداخت کیف پول را فقط یک‌بار انجام می‌دهد.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void cancel()} disabled={cancelling} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--status-danger)] px-5 font-semibold text-white disabled:opacity-60">{cancelling ? "در حال لغو…" : "تأیید لغو سفارش"}</button><button type="button" onClick={() => setDialogOpen(false)} disabled={cancelling} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-5">انصراف</button></div></section></div>}
  </Container></main>;
}
