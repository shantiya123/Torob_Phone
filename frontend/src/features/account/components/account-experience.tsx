"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Container,
  ErrorState,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Panel,
  Skeleton,
} from "@/components/ui";
import { useAuth } from "@/features/auth/context/auth-context";
import { ApiError, getPersianErrorMessage } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { CurrentUser } from "@/types/api";
import { getAccountRoleLabel } from "../lib/account-role";

const destinations = [
  { href: "/basket", title: "سبد خرید", description: "پیشنهادهای انتخاب‌شده و زمان رزرو آن‌ها" },
  { href: "/orders", title: "سفارش‌ها", description: "تاریخچه خرید و جزئیات سفارش‌های فروشگاهی" },
  { href: "/wallet", title: "کیف پول", description: "موجودی و تراکنش‌های مالی تأییدشده" },
] as const;

function AccountSkeleton() {
  return (
    <main id="main-content">
      <Container className="grid gap-6 py-8 md:py-12">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </Container>
    </main>
  );
}

function accountErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "invalid_response")
    return "پاسخ حساب کاربری با قرارداد معتبر سامانه سازگار نبود.";
  return getPersianErrorMessage(error);
}

export function AccountExperience() {
  const router = useRouter();
  const { user: sessionUser, refreshCurrentUser, updateEmail, logout } = useAuth();
  const [account, setAccount] = useState<CurrentUser | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const savingRef = useRef(false);
  const logoutRef = useRef(false);

  async function loadAccount() {
    setLoading(true);
    setRequestError(null);
    try {
      const result = await refreshCurrentUser();
      setAccount(result);
      setEmail(result.email);
    } catch (error) {
      setAccount(null);
      setRequestError(accountErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
    // The role boundary guarantees an authenticated session before this component mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || savingRef.current) return;
    const normalized = email.trim();
    setMessage(null);
    setEmailError(null);
    if (!normalized) {
      setEmailError("ایمیل نمی‌تواند خالی باشد.");
      return;
    }
    if (normalized === account.email) {
      setEmailError("ایمیل جدید با ایمیل فعلی یکسان است.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const confirmed = await updateEmail(normalized);
      setAccount(confirmed);
      setEmail(confirmed.email);
      setMessage("ایمیل حساب با تأیید سرور به‌روزرسانی شد.");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.email?.[0])
        setEmailError(error.fieldErrors.email[0]);
      else setEmailError(accountErrorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (logoutRef.current) return;
    logoutRef.current = true;
    setLoggingOut(true);
    setMessage("در حال خروج امن از حساب…");
    try {
      await logout();
      router.replace("/");
    } catch {
      router.replace("/");
    } finally {
      logoutRef.current = false;
      setLoggingOut(false);
    }
  }

  if (loading) return <AccountSkeleton />;

  if (!account || requestError) {
    return (
      <main id="main-content">
        <Container className="py-12">
          <ErrorState
            title="اطلاعات حساب دریافت نشد"
            description={requestError ?? "برای دریافت دوباره اطلاعات حساب تلاش کنید."}
            onRetry={() => void loadAccount()}
          />
        </Container>
      </main>
    );
  }

  const role = account.is_staff ? "staff" : account.account_type;

  return (
    <main id="main-content">
      <Container className="grid gap-6 py-8 md:py-12">
        <header className="grid gap-2">
          <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">فضای شخصی مشتری</p>
          <h1 className="m-0 text-3xl font-black md:text-4xl">حساب کاربری</h1>
          <p className="m-0 max-w-2xl leading-7 text-[var(--text-secondary)]">
            هویت حساب و مسیرهای اصلی خرید خود را از این بخش مدیریت کنید.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="grid content-start gap-6">
            <Panel className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-xl font-bold">هویت حساب</h2>
                  <p className="mt-2 mb-0 text-sm text-[var(--text-muted)]">
                    اطلاعات زیر مستقیماً از حساب تأییدشده شما دریافت شده است.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void loadAccount()}>
                  تازه‌سازی اطلاعات
                </Button>
              </div>

              <dl className="m-0 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-primary)] p-4">
                  <dt className="text-sm text-[var(--text-muted)]">نام کاربری</dt>
                  <dd className="mt-2 mb-0 break-all font-bold">{account.username}</dd>
                </div>
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-primary)] p-4">
                  <dt className="text-sm text-[var(--text-muted)]">نقش حساب</dt>
                  <dd className="mt-2 mb-0 font-bold">{getAccountRoleLabel(role)}</dd>
                </div>
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-primary)] p-4">
                  <dt className="text-sm text-[var(--text-muted)]">شناسه حساب</dt>
                  <dd className="mt-2 mb-0 font-bold">{formatNumber(account.id)}</dd>
                </div>
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-primary)] p-4">
                  <dt className="text-sm text-[var(--text-muted)]">تاریخ ایجاد</dt>
                  <dd className="mt-2 mb-0 font-bold">
                    {account.created_at ? formatDate(account.created_at) : "ثبت نشده"}
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel className="grid gap-5">
              <div>
                <h2 className="m-0 text-xl font-bold">ایمیل حساب</h2>
                <p className="mt-2 mb-0 text-sm leading-6 text-[var(--text-muted)]">
                  تنها فیلد قابل ویرایش در قرارداد فعلی حساب، ایمیل است. نام کاربری و نقش حساب فقط خواندنی هستند.
                </p>
              </div>
              <form className="grid gap-4" onSubmit={submitEmail} noValidate>
                <Field>
                  <FieldLabel htmlFor="account-email">ایمیل</FieldLabel>
                  <Input
                    id="account-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={saving}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby="account-email-description account-email-error"
                  />
                  <FieldDescription>
                    تغییر ایمیل پس از تأیید Django در نشست فعلی نیز همگام می‌شود.
                  </FieldDescription>
                  <FieldError id="account-email-error">{emailError}</FieldError>
                </Field>
                <div>
                  <Button type="submit" loading={saving} disabled={saving}>
                    ذخیره ایمیل
                  </Button>
                </div>
              </form>
            </Panel>
          </div>

          <aside className="grid content-start gap-6">
            <Panel className="grid gap-4">
              <h2 className="m-0 text-xl font-bold">مسیرهای مشتری</h2>
              <nav aria-label="بخش‌های حساب مشتری" className="grid gap-3">
                {destinations.map((destination) => (
                  <Link
                    key={destination.href}
                    href={destination.href}
                    className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] motion-reduce:transform-none"
                  >
                    <span className="block font-bold">{destination.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">
                      {destination.description}
                    </span>
                  </Link>
                ))}
              </nav>
            </Panel>

            <Panel className="grid gap-4">
              <div>
                <h2 className="m-0 text-xl font-bold">امنیت و نشست</h2>
                <p className="mt-2 mb-0 text-sm leading-6 text-[var(--text-muted)]">
                  تغییر رمز عبور در API فعلی پشتیبانی نمی‌شود؛ بنابراین هیچ فرم رمز عبور یا عملیات نمایشی اضافه نشده است.
                </p>
              </div>
              <Button variant="secondary" loading={loggingOut} onClick={() => void handleLogout()}>
                خروج از حساب
              </Button>
            </Panel>
          </aside>
        </div>

        <p role="status" aria-live="polite" className="m-0 min-h-6 text-sm text-[var(--text-secondary)]">
          {message ?? (sessionUser?.email !== account.email ? "اطلاعات نشست در حال همگام‌سازی است." : "")}
        </p>
      </Container>
    </main>
  );
}
