"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Button,
  Container,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Panel,
  Textarea,
} from "@/components/ui";
import { ApiError, authApi, getFieldErrors, getPersianErrorMessage } from "@/lib/api";
import type { StoreRegistrationInput, StoreRegistrationResponse } from "@/types/api";
import { useAuth } from "../context/auth-context";
import {
  storeRegistrationSchema,
  type StoreRegistrationFormValues,
} from "../schemas";
import { destinationFor } from "../utils/redirect";

const defaults: StoreRegistrationFormValues = {
  username: "",
  email: "",
  password: "",
  password_confirm: "",
  store: {
    name: "",
    description: "",
    business_phone: "",
    business_email: "",
    address: "",
  },
  legal_profile: {
    legal_name: "",
    business_type: "",
    business_registration_number: "",
    national_identifier: "",
    tax_identifier: "",
    legal_representative_name: "",
    legal_representative_national_identifier: "",
  },
};

const fieldMap = {
  username: "username",
  email: "email",
  password: "password",
  "store.name": "store.name",
  "store.description": "store.description",
  "store.business_phone": "store.business_phone",
  "store.business_email": "store.business_email",
  "store.address": "store.address",
  "legal_profile.legal_name": "legal_profile.legal_name",
  "legal_profile.business_type": "legal_profile.business_type",
  "legal_profile.business_registration_number": "legal_profile.business_registration_number",
  "legal_profile.national_identifier": "legal_profile.national_identifier",
  "legal_profile.tax_identifier": "legal_profile.tax_identifier",
  "legal_profile.legal_representative_name": "legal_profile.legal_representative_name",
  "legal_profile.legal_representative_national_identifier":
    "legal_profile.legal_representative_national_identifier",
} as const;

type KnownField = (typeof fieldMap)[keyof typeof fieldMap];

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function AuthenticatedRegistrationNotice() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const destination = destinationFor(user.role, null);
  const copy =
    user.role === "store"
      ? "این حساب از قبل فروشگاهی است. برای ثبت فروشگاه دیگری باید با یک حساب جداگانه و در حالت خروج ثبت‌نام کنید."
      : user.role === "customer"
        ? "ثبت فروشگاه یک حساب فروشگاهی جداگانه می‌سازد و نقش حساب مشتری فعلی را تغییر نمی‌دهد. برای ادامه ابتدا از حساب فعلی خارج شوید."
        : "ثبت فروشگاه یک اقدام عمومی برای متقاضی فروشگاه است و از حساب کارشناس انجام نمی‌شود.";
  return (
    <main id="main-content">
      <Container className="grid min-h-[65vh] place-items-center py-12">
        <Panel className="grid w-full max-w-2xl gap-5 text-center">
          <h1 className="m-0 text-2xl font-bold">ثبت فروشگاه</h1>
          <p className="m-0 leading-7 text-[var(--text-secondary)]">{copy}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={destination} className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-5 font-semibold">
              بازگشت به فضای حساب
            </Link>
            {user.role !== "store" && (
              <Button variant="secondary" onClick={() => void logout()}>
                خروج و ثبت حساب فروشگاهی
              </Button>
            )}
          </div>
        </Panel>
      </Container>
    </main>
  );
}

export function StoreRegistrationExperience() {
  const { status, user, refreshSession } = useAuth();
  const [result, setResult] = useState<StoreRegistrationResponse | null>(null);
  const submissionLock = useRef(false);
  const form = useForm<StoreRegistrationFormValues>({
    resolver: zodResolver(storeRegistrationSchema),
    defaultValues: defaults,
  });

  if (status === "initializing") {
    return (
      <main id="main-content">
        <Container className="py-12"><Panel>در حال بررسی وضعیت حساب…</Panel></Container>
      </main>
    );
  }
  if (status === "error") {
    return (
      <main id="main-content">
        <Container className="grid min-h-[65vh] place-items-center py-12">
          <Panel className="grid w-full max-w-xl gap-4 text-center">
            <h1 className="m-0 text-xl font-bold">وضعیت حساب قابل بررسی نیست</h1>
            <p className="m-0 text-sm leading-7 text-[var(--text-secondary)]">پیش از نمایش فرم باید مطمئن شویم حساب فروشگاهی دیگری فعال نیست.</p>
            <Button variant="secondary" onClick={() => void refreshSession()}>بررسی دوباره</Button>
          </Panel>
        </Container>
      </main>
    );
  }
  if (status === "authenticated" && user) return <AuthenticatedRegistrationNotice />;

  if (result) {
    return (
      <main id="main-content">
        <Container className="grid min-h-[65vh] place-items-center py-12">
          <Panel className="grid w-full max-w-2xl gap-5 text-center" role="status">
            <span className="mx-auto rounded-full border border-[var(--status-warning)]/50 px-4 py-2 text-sm font-semibold text-[var(--status-warning)]">در انتظار بررسی</span>
            <h1 className="m-0 text-2xl font-bold">درخواست فروشگاه ثبت شد</h1>
            <p className="m-0 leading-7 text-[var(--text-secondary)]">
              فروشگاه «{result.store.name}» با وضعیت «در انتظار بررسی» ایجاد شد. ورود به حساب ممکن است، اما امکانات مدیریتی وابسته به تأیید کارشناسان است.
            </p>
            <p className="m-0 text-sm text-[var(--text-muted)]">نام کاربری: <span dir="ltr">{result.username}</span></p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/login?registered=store" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-white">ورود به حساب فروشگاهی</Link>
              <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-5 font-semibold">بازگشت به صفحه اصلی</Link>
            </div>
          </Panel>
        </Container>
      </main>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (submissionLock.current) return;
    submissionLock.current = true;
    form.clearErrors("root");
    try {
      const parsed = storeRegistrationSchema.parse(values);
      const request: StoreRegistrationInput = {
        account_type: "store",
        username: parsed.username.trim(),
        email: parsed.email.trim(),
        password: parsed.password,
        store: {
          name: parsed.store.name.trim(),
          description: optional(parsed.store.description),
          business_phone: parsed.store.business_phone.trim(),
          business_email: optional(parsed.store.business_email),
          address: parsed.store.address.trim(),
        },
        legal_profile: {
          legal_name: parsed.legal_profile.legal_name.trim(),
          business_type: parsed.legal_profile.business_type.trim(),
          business_registration_number: optional(parsed.legal_profile.business_registration_number),
          national_identifier: optional(parsed.legal_profile.national_identifier),
          tax_identifier: optional(parsed.legal_profile.tax_identifier),
          legal_representative_name: parsed.legal_profile.legal_representative_name.trim(),
          legal_representative_national_identifier: optional(parsed.legal_profile.legal_representative_national_identifier),
        },
      };
      const response = await authApi.registerStore(request);
      setResult(response);
      form.reset(defaults);
    } catch (error) {
      const errors = getFieldErrors(error);
      let mapped = false;
      for (const [backendField, messages] of Object.entries(errors)) {
        const field = fieldMap[backendField as keyof typeof fieldMap] as KnownField | undefined;
        if (field) {
          mapped = true;
          form.setError(field, { type: "server", message: messages[0] ?? "این مقدار معتبر نیست." });
        }
      }
      if (!mapped) {
        const message = error instanceof ApiError && error.code === "invalid_response"
          ? "ثبت‌نام انجام شدنی قابل تأیید نبود. هیچ نشست ساختگی ایجاد نشد؛ پیش از تلاش دوباره وضعیت حساب را بررسی کنید."
          : getPersianErrorMessage(error);
        form.setError("root", { type: "server", message });
      }
    } finally {
      submissionLock.current = false;
    }
  });

  return (
    <main id="main-content">
      <Container className="grid gap-7 py-10 lg:py-14">
        <header className="grid max-w-3xl gap-3">
          <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">درخواست همکاری فروشگاهی</p>
          <h1 className="m-0 text-3xl font-bold">ثبت فروشگاه در ترب فون</h1>
          <p className="m-0 leading-7 text-[var(--text-secondary)]">یک حساب فروشگاهی جداگانه ایجاد می‌شود. اطلاعات عمومی فروشگاه و اطلاعات قانونی برای بررسی کارشناسان ارسال می‌شوند و وضعیت اولیه همیشه «در انتظار بررسی» است.</p>
        </header>

        <form className="grid gap-6" onSubmit={onSubmit} noValidate>
          {form.formState.errors.root?.message && <Alert tone="danger" title="ثبت درخواست ناموفق">{form.formState.errors.root.message}</Alert>}

          <Section title="اطلاعات حساب" description="برای ورود بعدی به فضای فروشگاه استفاده می‌شود.">
            <FieldBlock id="store-register-username" label="نام کاربری" error={form.formState.errors.username?.message}>
              <Input id="store-register-username" dir="ltr" autoComplete="username" aria-invalid={!!form.formState.errors.username} {...form.register("username")} />
            </FieldBlock>
            <FieldBlock id="store-register-email" label="ایمیل حساب" error={form.formState.errors.email?.message}>
              <Input id="store-register-email" type="email" dir="ltr" autoComplete="email" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
            </FieldBlock>
            <FieldBlock id="store-register-password" label="رمز عبور" error={form.formState.errors.password?.message}>
              <Input id="store-register-password" type="password" dir="ltr" autoComplete="new-password" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
            </FieldBlock>
            <FieldBlock id="store-register-password-confirm" label="تکرار رمز عبور" error={form.formState.errors.password_confirm?.message}>
              <Input id="store-register-password-confirm" type="password" dir="ltr" autoComplete="new-password" aria-invalid={!!form.formState.errors.password_confirm} {...form.register("password_confirm")} />
            </FieldBlock>
          </Section>

          <Section title="اطلاعات عمومی فروشگاه" description="نام، توضیحات و اطلاعات تماس پس از تأیید می‌توانند در صفحات عمومی فروشگاه نمایش داده شوند.">
            <FieldBlock id="store-name" label="نام فروشگاه" error={form.formState.errors.store?.name?.message}><Input id="store-name" {...form.register("store.name")} /></FieldBlock>
            <FieldBlock id="store-phone" label="شماره تماس فروشگاه" error={form.formState.errors.store?.business_phone?.message}><Input id="store-phone" type="tel" dir="ltr" autoComplete="tel" {...form.register("store.business_phone")} /></FieldBlock>
            <FieldBlock id="store-business-email" label="ایمیل کاری (اختیاری)" error={form.formState.errors.store?.business_email?.message}><Input id="store-business-email" type="email" dir="ltr" autoComplete="email" {...form.register("store.business_email")} /></FieldBlock>
            <FieldBlock id="store-address" label="نشانی فروشگاه" error={form.formState.errors.store?.address?.message} className="md:col-span-2"><Textarea id="store-address" autoComplete="street-address" {...form.register("store.address")} /></FieldBlock>
            <FieldBlock id="store-description" label="معرفی فروشگاه (اختیاری)" error={form.formState.errors.store?.description?.message} className="md:col-span-2"><Textarea id="store-description" {...form.register("store.description")} /></FieldBlock>
          </Section>

          <Section title="اطلاعات قانونی و بررسی" description="این اطلاعات خصوصی است و برای بررسی کارشناسان استفاده می‌شود؛ در صفحه عمومی فروشگاه نمایش داده نمی‌شود.">
            <FieldBlock id="legal-name" label="نام قانونی" error={form.formState.errors.legal_profile?.legal_name?.message}><Input id="legal-name" {...form.register("legal_profile.legal_name")} /></FieldBlock>
            <FieldBlock id="business-type" label="نوع کسب‌وکار" error={form.formState.errors.legal_profile?.business_type?.message}><Input id="business-type" placeholder="برای مثال: شرکت، شخص حقیقی" {...form.register("legal_profile.business_type")} /></FieldBlock>
            <FieldBlock id="registration-number" label="شماره ثبت (اختیاری)" error={form.formState.errors.legal_profile?.business_registration_number?.message}><Input id="registration-number" dir="ltr" {...form.register("legal_profile.business_registration_number")} /></FieldBlock>
            <FieldBlock id="national-id" label="شناسه ملی (اختیاری)" error={form.formState.errors.legal_profile?.national_identifier?.message}><Input id="national-id" dir="ltr" {...form.register("legal_profile.national_identifier")} /></FieldBlock>
            <FieldBlock id="tax-id" label="شناسه مالیاتی (اختیاری)" error={form.formState.errors.legal_profile?.tax_identifier?.message}><Input id="tax-id" dir="ltr" {...form.register("legal_profile.tax_identifier")} /></FieldBlock>
            <FieldBlock id="representative-name" label="نام نماینده قانونی" error={form.formState.errors.legal_profile?.legal_representative_name?.message}><Input id="representative-name" {...form.register("legal_profile.legal_representative_name")} /></FieldBlock>
            <FieldBlock id="representative-national-id" label="شناسه ملی نماینده (اختیاری)" error={form.formState.errors.legal_profile?.legal_representative_national_identifier?.message}><Input id="representative-national-id" dir="ltr" {...form.register("legal_profile.legal_representative_national_identifier")} /></FieldBlock>
          </Section>

          <Panel className="grid gap-4 border-[var(--status-warning)]/40">
            <h2 className="m-0 text-lg font-bold">پیش از ارسال</h2>
            <p className="m-0 text-sm leading-7 text-[var(--text-secondary)]">ارسال این فرم به معنی تأیید فروشگاه نیست. حساب و پروفایل فروشگاه به‌صورت اتمیک با وضعیت «در انتظار بررسی» ساخته می‌شوند و هیچ فیلد تأیید یا بررسی از مرورگر ارسال نمی‌شود.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={form.formState.isSubmitting} disabled={form.formState.isSubmitting}>ارسال درخواست ثبت فروشگاه</Button>
              <Link href="/login" className="text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:underline">قبلاً حساب ساخته‌اید؟ ورود</Link>
            </div>
          </Panel>
        </form>
      </Container>
    </main>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Panel className="grid gap-5">
      <header className="grid gap-1"><h2 className="m-0 text-xl font-bold">{title}</h2><p className="m-0 text-sm leading-6 text-[var(--text-muted)]">{description}</p></header>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </Panel>
  );
}

function FieldBlock({ id, label, error, children, className }: { id: string; label: string; error?: string; children: ReactNode; className?: string }) {
  const errorId = `${id}-error`;
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}
