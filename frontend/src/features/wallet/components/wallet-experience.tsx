"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Container, DateDisplay, EmptyState, ErrorState, Panel, PriceDisplay, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { walletApi } from "@/lib/api/wallet";
import { formatNumber, formatPrice } from "@/lib/format";
import type { PaginatedResponse, Wallet, WalletTransaction } from "@/types/api";
import { getWalletTransactionDirection, getWalletTransactionLabel } from "@/features/wallet/lib/wallet-transaction";

const PAGE_SIZE = 20;
const MIN_CHARGE = 1_000_000;
const MAX_CHARGE = 100_000_000;
const PRESETS = [1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: unknown };

type ChargeState = "idle" | "confirm" | "pending" | "uncertain";

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function pageHref(pathname: string, page: number): string {
  return page === 1 ? pathname : `${pathname}?page=${page}`;
}

function TransactionCard({ transaction }: { transaction: WalletTransaction }) {
  const direction = getWalletTransactionDirection(transaction.amount);
  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-level-1)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 font-bold">{getWalletTransactionLabel(transaction.transaction_type)}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">تراکنش شماره <span dir="ltr">{transaction.id}</span></p>
        </div>
        <div className="text-left">
          <p className="m-0 font-bold" data-direction={direction}>
            <span className="sr-only">{direction === "credit" ? "بستانکار" : direction === "debit" ? "بدهکار" : "بدون تغییر"}: </span>
            <span dir="ltr">{transaction.amount > 0 ? "+" : ""}{formatPrice(transaction.amount)}</span>
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">مانده پس از تراکنش: <PriceDisplay value={transaction.balance_after} /></p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <DateDisplay value={transaction.created_at} />
        {transaction.order ? (
          <Link href={`/orders/${transaction.order}`} className="font-semibold text-[var(--accent-radish)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            مشاهده سفارش {transaction.order}
          </Link>
        ) : <span className="text-xs text-[var(--text-muted)]">بدون سفارش مرتبط</span>}
      </div>
    </li>
  );
}

export function WalletExperience() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);
  const [walletState, setWalletState] = useState<AsyncState<Wallet>>({ status: "loading", data: null, error: null });
  const [historyState, setHistoryState] = useState<AsyncState<PaginatedResponse<WalletTransaction>>>({ status: "loading", data: null, error: null });
  const [amountText, setAmountText] = useState(String(PRESETS[0]));
  const [chargeState, setChargeState] = useState<ChargeState>("idle");
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const activeKeyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const loadWallet = useCallback(async () => {
    setWalletState({ status: "loading", data: null, error: null });
    try { setWalletState({ status: "ready", data: await walletApi.get(), error: null }); }
    catch (error) { setWalletState({ status: "error", data: null, error }); }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryState({ status: "loading", data: null, error: null });
    try { setHistoryState({ status: "ready", data: await walletApi.transactions({ page, pageSize: PAGE_SIZE }), error: null }); }
    catch (error) { setHistoryState({ status: "error", data: null, error }); }
  }, [page]);

  useEffect(() => { void loadWallet(); }, [loadWallet]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const amount = /^\d+$/.test(amountText) ? Number(amountText) : Number.NaN;
  const amountValid = Number.isSafeInteger(amount) && amount >= MIN_CHARGE && amount <= MAX_CHARGE;

  const submitCharge = useCallback(async (reuseKey = false) => {
    if (!amountValid || submittingRef.current) return;
    submittingRef.current = true;
    setChargeState("pending");
    setChargeError(null);
    setAnnouncement("افزایش موجودی آغاز شد.");
    const key = reuseKey && activeKeyRef.current ? activeKeyRef.current : crypto.randomUUID();
    activeKeyRef.current = key;
    try {
      const result = await walletApi.charge(amount, key);
      setWalletState({ status: "ready", data: result.wallet, error: null });
      activeKeyRef.current = null;
      setChargeState("idle");
      setAnnouncement("افزایش موجودی با تأیید سرور انجام شد.");
      await loadHistory();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const conclusive = apiError?.code === "validation_error" || (apiError?.status === 400 && apiError.backendCode !== "wallet_charge_in_progress");
      if (conclusive) {
        activeKeyRef.current = null;
        setChargeState("idle");
        setChargeError(apiError?.fieldErrors.amount?.[0] ?? "مبلغ واردشده توسط سرور پذیرفته نشد.");
      } else {
        setChargeState("uncertain");
        setChargeError("نتیجه افزایش موجودی قابل تأیید نیست. موجودی تأییدشده قبلی حفظ شده است؛ برای بررسی امن، همین تلاش را با همان شناسه دوباره ارسال کنید.");
      }
      setAnnouncement("افزایش موجودی تأیید نشد.");
    } finally {
      submittingRef.current = false;
    }
  }, [amount, amountValid, loadHistory, loadWallet]);

  const refreshAll = async () => {
    await Promise.all([loadWallet(), loadHistory()]);
    setAnnouncement("اطلاعات کیف پول تازه‌سازی شد.");
  };

  const walletInvalid = walletState.status === "error" && walletState.error instanceof ApiError && walletState.error.code === "invalid_response";
  const historyInvalid = historyState.status === "error" && historyState.error instanceof ApiError && historyState.error.code === "invalid_response";

  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <p aria-live="polite" className="sr-only">{announcement}</p>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">مدیریت مالی مشتری</p>
            <h1 className="m-0 text-3xl font-bold sm:text-4xl">کیف پول</h1>
            <p className="mt-4 max-w-2xl leading-8 text-[var(--text-secondary)]">موجودی و تمام تراکنش‌ها مستقیماً از جنگو دریافت می‌شوند و در مرورگر محاسبه نمی‌شوند.</p>
          </div>
          <Button variant="secondary" onClick={() => void refreshAll()}>تازه‌سازی کیف پول</Button>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="wallet-transactions-title" className="min-w-0">
            <h2 id="wallet-transactions-title" className="mb-5 text-2xl font-bold">تاریخچه تراکنش‌ها</h2>
            {historyState.status === "loading" ? (
              <div className="grid gap-4">{[0,1,2].map((item)=><Skeleton key={item} className="h-40" />)}</div>
            ) : historyState.status === "error" ? (
              <ErrorState title={historyInvalid ? "پاسخ تاریخچه تراکنش‌ها معتبر نبود" : "تاریخچه تراکنش‌ها بارگذاری نشد"} description={historyInvalid ? "برای محافظت از اطلاعات مالی، داده تأییدنشده نمایش داده نمی‌شود." : "موجودی کیف پول مستقل باقی می‌ماند. تاریخچه را دوباره دریافت کنید."} onRetry={() => void loadHistory()} />
            ) : historyState.data.results.length === 0 ? (
              historyState.data.count > 0 ? <EmptyState title="این صفحه از تراکنش‌ها وجود ندارد" description="به صفحه اول تاریخچه برگردید." action={<Link href="/wallet" className="font-semibold text-[var(--accent-radish)]">بازگشت به صفحه اول</Link>} /> : <EmptyState title="هنوز تراکنشی ثبت نشده است" description="موجودی کیف پول همچنان از پاسخ مستقیم جنگو نمایش داده می‌شود." />
            ) : (
              <>
                <ul className="m-0 grid list-none gap-4 p-0">{historyState.data.results.map((transaction)=><TransactionCard key={transaction.id} transaction={transaction} />)}</ul>
                {Math.ceil(historyState.data.count / PAGE_SIZE) > 1 && (
                  <nav aria-label="صفحه‌بندی تراکنش‌های کیف پول" className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {page > 1 ? <Link href={pageHref(pathname, page - 1)} aria-label="صفحه قبلی تراکنش‌ها" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4">→ قبلی</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">→ قبلی</span>}
                    <span aria-current="page">صفحه {formatNumber(page)} از {formatNumber(Math.max(1, Math.ceil(historyState.data.count / PAGE_SIZE)))}</span>
                    {page < Math.ceil(historyState.data.count / PAGE_SIZE) ? <Link href={pageHref(pathname, page + 1)} aria-label="صفحه بعدی تراکنش‌ها" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4">بعدی ←</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[var(--text-muted)]">بعدی ←</span>}
                  </nav>
                )}
              </>
            )}
          </section>

          <aside className="grid gap-5 lg:sticky lg:top-24">
            {walletState.status === "loading" ? <Skeleton className="h-44" /> : walletState.status === "error" ? <ErrorState title={walletInvalid ? "پاسخ کیف پول معتبر نبود" : "موجودی کیف پول دریافت نشد"} description={walletInvalid ? "موجودی تأییدنشده نمایش داده نمی‌شود." : "بدون موجودی معتبر، عملیات مالی در دسترس نیست."} onRetry={() => void loadWallet()} /> : (
              <Panel>
                <p className="m-0 text-sm text-[var(--text-muted)]">موجودی فعلی</p>
                <p className="my-4 break-words text-3xl font-black"><PriceDisplay value={walletState.data.balance} /></p>
                <p className="m-0 text-xs text-[var(--text-muted)]">آخرین به‌روزرسانی: <DateDisplay value={walletState.data.updated_at} /></p>
              </Panel>
            )}

            <Panel>
              <h2 className="m-0 text-xl font-bold">افزایش موجودی آزمایشی</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">این عملیات از درگاه بانکی استفاده نمی‌کند و فقط endpoint داخلی و آزمایشی پروژه را فراخوانی می‌کند.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">{PRESETS.map((preset)=><Button key={preset} disabled={chargeState === "pending" || chargeState === "uncertain"} variant={amount === preset ? "primary" : "secondary"} onClick={() => setAmountText(String(preset))}>{formatNumber(preset)}</Button>)}</div>
              <label htmlFor="wallet-charge-amount" className="mt-5 block text-sm font-semibold">مبلغ در واحد پولی پروژه</label>
              <input id="wallet-charge-amount" inputMode="numeric" disabled={chargeState === "pending" || chargeState === "uncertain"} value={amountText} onChange={(event)=>setAmountText(event.target.value.replace(/[^0-9]/g, ""))} aria-invalid={!amountValid} aria-describedby="wallet-charge-help wallet-charge-error" className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 text-left tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" />
              <p id="wallet-charge-help" className="mt-2 text-xs text-[var(--text-muted)]">حداقل {formatNumber(MIN_CHARGE)} و حداکثر {formatNumber(MAX_CHARGE)} واحد.</p>
              {!amountValid && amountText && <p id="wallet-charge-error" role="alert" className="mt-2 text-sm text-[var(--status-danger)]">مبلغ باید یک عدد صحیح در بازه مجاز باشد.</p>}
              {chargeError && <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">{chargeError}</p>}
              {chargeState === "uncertain" ? <Button className="mt-4 w-full" onClick={() => void submitCharge(true)}>بررسی دوباره همین تلاش</Button> : <Button className="mt-4 w-full" disabled={!amountValid || walletState.status !== "ready"} loading={chargeState === "pending"} onClick={() => setChargeState("confirm")}>ادامه افزایش موجودی</Button>}
            </Panel>
          </aside>
        </div>

        {chargeState === "confirm" && (
          <div role="dialog" aria-modal="true" aria-labelledby="wallet-charge-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
            <Panel className="w-full max-w-md">
              <h2 id="wallet-charge-dialog-title" className="m-0 text-xl font-bold">تأیید افزایش موجودی آزمایشی</h2>
              <p className="mt-4 leading-7">مبلغ <strong>{formatPrice(amount)}</strong> از طریق endpoint آزمایشی پروژه به کیف پول افزوده می‌شود. این عملیات درگاه بانکی واقعی ندارد.</p>
              <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={()=>setChargeState("idle")}>انصراف</Button><Button autoFocus onClick={()=>void submitCharge(false)}>تأیید افزایش موجودی</Button></div>
            </Panel>
          </div>
        )}
      </Container>
    </main>
  );
}
