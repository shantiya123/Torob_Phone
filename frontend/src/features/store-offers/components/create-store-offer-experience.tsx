"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  ErrorState,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  NumberDisplay,
  PriceDisplay,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { ApiError, catalogApi, offersApi, storesApi } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type {
  CreatedOfferResponse,
  PaginatedResponse,
  StoreCatalogPhone,
  StoreCatalogPhoneDetail,
  StoreCatalogVariant,
  StoreDashboardResponse,
  StoreStatus,
} from "@/types/api";

const PAGE_SIZE = 12;

type LoadState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: unknown };

type FormErrors = Partial<Record<"variant" | "price" | "quantity" | "description" | "form", string>>;

function parsePositiveId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function fieldMessage(error: ApiError, field: string): string | undefined {
  const message = error.fieldErrors[field]?.[0];
  if (!message) return undefined;
  if (field === "device_variant" && /already has an offer/i.test(message))
    return "برای این تنوع قبلاً یک پیشنهاد ثبت کرده‌اید. از فهرست پیشنهادها آن را ویرایش کنید.";
  if (field === "price") return "قیمت باید یک عدد صحیح مثبت در واحد مالی پروژه باشد.";
  if (field === "quantity") return "موجودی باید یک عدد صحیح صفر یا بیشتر باشد.";
  return message;
}

function statusCopy(status: StoreStatus) {
  switch (status) {
    case "pending":
      return ["ثبت فروشگاه در انتظار بررسی است", "پس از تأیید Staff، امکان ساخت پیشنهاد فروش فعال می‌شود."] as const;
    case "rejected":
      return ["ثبت فروشگاه تأیید نشده است", "برای بررسی وضعیت و اصلاح اطلاعات فروشگاه از مسیر حساب فروشگاه اقدام کنید."] as const;
    case "suspended":
      return ["دسترسی عملیاتی فروشگاه تعلیق شده است", "تا زمانی که وضعیت فروشگاه دوباره فعال نشود، امکان ایجاد پیشنهاد وجود ندارد."] as const;
    default:
      return ["دسترسی ایجاد پیشنهاد فعال نیست", "وضعیت فروشگاه اجازه انجام این عملیات را نمی‌دهد."] as const;
  }
}

function VariantSummary({ variant, onChange }: { variant: StoreCatalogVariant; onChange(): void }) {
  const image = resolveMediaUrl(variant.image_url) ?? "/icon.svg";
  return (
    <Card>
      <CardHeader>
        <CardTitle>تنوع انتخاب‌شده</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
          <div className="grid aspect-square place-items-center rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
            <Image unoptimized src={image} alt={`تصویر ${variant.brand} ${variant.model_name}`} width={120} height={120} className="size-full object-contain" />
          </div>
          <div>
            <p className="m-0 text-lg font-bold" dir="ltr">{variant.brand} {variant.model_name}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              رم {variant.ram_gb === null ? "نامشخص" : `${variant.ram_gb} گیگابایت`} · حافظه {variant.storage_gb === null ? "نامشخص" : `${variant.storage_gb} گیگابایت`}
              {variant.storage_technology ? ` · ${variant.storage_technology}` : ""}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">شناسه تنوع: <NumberDisplay value={variant.id} /></p>
          </div>
        </div>
        {variant.owned_offer ? (
          <div role="alert" className="rounded-[var(--radius-control)] border border-[var(--status-warning)]/50 bg-[var(--surface-secondary)] p-4 text-sm leading-6">
            برای این تنوع قبلاً پیشنهاد ثبت شده است. به‌جای ساخت مورد تکراری، پیشنهاد موجود را ویرایش کنید.
            <div className="mt-3"><Link href={`/store/offers/${variant.owned_offer.id}/edit`} className="font-semibold text-[var(--accent-radish)]">ویرایش پیشنهاد موجود</Link></div>
          </div>
        ) : null}
        <Button type="button" variant="secondary" onClick={onChange}>تغییر تنوع انتخاب‌شده</Button>
      </CardContent>
    </Card>
  );
}

export function CreateStoreOfferExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVariant = parsePositiveId(searchParams.get("variant") ?? searchParams.get("variantId"));
  const [dashboard, setDashboard] = useState<LoadState<StoreDashboardResponse>>({ status: "loading", data: null, error: null });
  const [catalog, setCatalog] = useState<LoadState<PaginatedResponse<StoreCatalogPhone>>>({ status: "loading", data: null, error: null });
  const [phoneDetail, setPhoneDetail] = useState<LoadState<StoreCatalogPhoneDetail> | null>(null);
  const [selected, setSelected] = useState<StoreCatalogVariant | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedOfferResponse | null>(null);
  const submitLock = useRef(false);
  const preselectionStarted = useRef(false);

  const loadDashboard = useCallback(async () => {
    setDashboard({ status: "loading", data: null, error: null });
    try { setDashboard({ status: "ready", data: await storesApi.dashboard(), error: null }); }
    catch (error) { setDashboard({ status: "error", data: null, error }); }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalog({ status: "loading", data: null, error: null });
    try {
      const data = await catalogApi.phones({ page, pageSize: PAGE_SIZE, ...(appliedSearch ? { search: appliedSearch } : {}) });
      setCatalog({ status: "ready", data, error: null });
    } catch (error) { setCatalog({ status: "error", data: null, error }); }
  }, [appliedSearch, page]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (dashboard.status === "ready" && dashboard.data.operational_access) void loadCatalog();
  }, [dashboard, loadCatalog]);

  useEffect(() => {
    if (!preselectedVariant || preselectionStarted.current || dashboard.status !== "ready" || !dashboard.data.operational_access) return;
    preselectionStarted.current = true;
    void catalogApi.variant(preselectedVariant)
      .then((variant) => setSelected({ ...variant, owned_offer: null, market: { offer_count: 0, lowest_price: null, highest_price: null } }))
      .catch((error) => setErrors({ variant: error instanceof ApiError && error.code === "not_found" ? "این تنوع برای ایجاد پیشنهاد در دسترس نیست." : "تنوع انتخاب‌شده قابل تأیید نیست." }));
  }, [dashboard, preselectedVariant]);

  const choosePhone = async (phoneId: number) => {
    setPhoneDetail({ status: "loading", data: null, error: null });
    try { setPhoneDetail({ status: "ready", data: await catalogApi.phone(phoneId), error: null }); }
    catch (error) { setPhoneDetail({ status: "error", data: null, error }); }
  };

  const totalPages = useMemo(() => catalog.status === "ready" ? Math.max(1, Math.ceil(catalog.data.count / PAGE_SIZE)) : 1, [catalog]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;
    const nextErrors: FormErrors = {};
    if (!selected) nextErrors.variant = "یک تنوع دقیق گوشی انتخاب کنید.";
    if (selected?.owned_offer) nextErrors.variant = "برای این تنوع قبلاً پیشنهاد ثبت شده است.";
    const parsedPrice = normalizeInteger(price);
    const parsedQuantity = normalizeInteger(quantity);
    if (parsedPrice === null || parsedPrice <= 0) nextErrors.price = "قیمت باید یک عدد صحیح مثبت باشد.";
    if (parsedQuantity === null) nextErrors.quantity = "موجودی باید یک عدد صحیح صفر یا بیشتر باشد.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }

    submitLock.current = true;
    setSubmitting(true);
    setErrors({});
    try {
      const result = await offersApi.create({
        device_variant: selected!.id,
        price: parsedPrice!,
        quantity: parsedQuantity!,
        description: description.trim() || null,
      });
      if (result.device_variant !== selected!.id) throw new ApiError({ code: "invalid_response", message: "Created offer variant did not match selection." });
      setCreated(result);
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped: FormErrors = {};
        const variantError = fieldMessage(error, "device_variant");
        const priceError = fieldMessage(error, "price");
        const quantityError = fieldMessage(error, "quantity");
        const descriptionError = fieldMessage(error, "description");
        if (variantError) mapped.variant = variantError;
        if (priceError) mapped.price = priceError;
        if (quantityError) mapped.quantity = quantityError;
        if (descriptionError) mapped.description = descriptionError;
        if (error.code === "forbidden")
          mapped.form = "فقط فروشگاه فعال می‌تواند پیشنهاد ایجاد کند. وضعیت فروشگاه را دوباره بررسی کنید.";
        else if (["network_error", "timeout", "invalid_response"].includes(error.code))
          mapped.form = "نتیجه ایجاد پیشنهاد قابل تأیید نیست. فرم حفظ شده است؛ پیش از ارسال دوباره، فهرست پیشنهادها را بررسی کنید.";
        else if (!Object.keys(error.fieldErrors).length)
          mapped.form = "ایجاد پیشنهاد انجام نشد. اطلاعات را بررسی کنید.";
        setErrors(mapped);
      } else setErrors({ form: "ایجاد پیشنهاد انجام نشد." });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (dashboard.status === "loading") return <main id="main-content"><Container className="py-10"><Skeleton className="h-10 w-72" /><Skeleton className="mt-8 h-96" /></Container></main>;
  if (dashboard.status === "error") return <main id="main-content"><Container className="grid min-h-[55vh] place-items-center py-16"><ErrorState title="وضعیت فروشگاه دریافت نشد" description="برای محافظت از دسترسی عملیاتی، فرم تا تأیید وضعیت فروشگاه نمایش داده نمی‌شود." onRetry={() => void loadDashboard()} /></Container></main>;
  if (!dashboard.data.operational_access) {
    const [title, descriptionText] = statusCopy(dashboard.data.store.status);
    return <main id="main-content"><Container className="grid min-h-[55vh] place-items-center py-16"><EmptyState title={title} description={descriptionText} action={<Link href="/store/offers" className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-5 font-semibold">بازگشت به پیشنهادهای فروشگاه</Link>} /></Container></main>;
  }

  if (created) {
    return <main id="main-content"><Container className="grid min-h-[60vh] place-items-center py-16"><Card className="w-full max-w-xl"><CardHeader><CardTitle>پیشنهاد با موفقیت ثبت شد</CardTitle></CardHeader><CardContent className="grid gap-5"><p className="m-0 leading-8 text-[var(--text-secondary)]">پیشنهاد شماره <NumberDisplay value={created.id} /> با پاسخ تأییدشده Django ایجاد شد.</p><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-[var(--text-muted)]">قیمت</dt><dd className="m-0 mt-1 font-bold"><PriceDisplay value={created.price} /></dd></div><div><dt className="text-xs text-[var(--text-muted)]">موجودی</dt><dd className="m-0 mt-1"><NumberDisplay value={created.quantity} /> عدد</dd></div></dl><Button onClick={() => router.push("/store/offers")}>مشاهده فهرست پیشنهادها</Button></CardContent></Card></Container></main>;
  }

  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <header className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">فضای عملیاتی فروشگاه</p>
          <h1 className="m-0 text-3xl font-bold sm:text-4xl">ایجاد پیشنهاد فروش</h1>
          <p className="mt-4 leading-8 text-[var(--text-secondary)]">یک تنوع دقیق گوشی را از کاتالوگ انتخاب کن و قیمت و موجودی فروشگاه خودت را ثبت کن. مالکیت فروشگاه از حساب واردشده تعیین می‌شود.</p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <section aria-labelledby="variant-selection-heading" className="grid gap-5">
            <Card>
              <CardHeader><CardTitle><span id="variant-selection-heading">انتخاب تنوع گوشی</span></CardTitle></CardHeader>
              <CardContent className="grid gap-5">
                <form onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field><FieldLabel htmlFor="catalog-search">جست‌وجوی برند یا مدل</FieldLabel><Input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="مثلاً Samsung یا Galaxy" maxLength={100} /></Field>
                  <Button type="submit">جست‌وجو</Button>
                </form>
                {errors.variant ? <FieldError id="variant-error">{errors.variant}</FieldError> : null}

                {catalog.status === "loading" ? <div className="grid gap-3">{[0,1,2].map((item)=><Skeleton key={item} className="h-24" />)}</div> : null}
                {catalog.status === "error" ? <ErrorState title="کاتالوگ بارگذاری نشد" description="جست‌وجوی کاتالوگ فروشگاه در دسترس نیست." onRetry={() => void loadCatalog()} /> : null}
                {catalog.status === "ready" && catalog.data.results.length === 0 ? <EmptyState title="گوشی واجد شرایطی پیدا نشد" description="عبارت جست‌وجو را تغییر بده. فقط گوشی‌های واجد شرایط کاتالوگ نمایش داده می‌شوند." /> : null}
                {catalog.status === "ready" && catalog.data.results.length > 0 ? (
                  <div className="grid gap-3">
                    {catalog.data.results.map((phone) => (
                      <button key={phone.id} type="button" onClick={() => void choosePhone(phone.id)} className="grid min-h-20 grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-right hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                        <Image unoptimized src={resolveMediaUrl(phone.image_url) ?? "/icon.svg"} alt="" width={64} height={64} className="size-16 object-contain" />
                        <span><strong dir="ltr" className="block">{phone.brand} {phone.model}</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">نمایش تنوع‌های قابل ارائه</span></span>
                        <span aria-hidden="true">←</span>
                      </button>
                    ))}
                    {totalPages > 1 ? <nav aria-label="صفحه‌بندی کاتالوگ" className="flex items-center justify-center gap-3"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</Button><span className="text-sm">صفحه <NumberDisplay value={page} /> از <NumberDisplay value={totalPages} /></span><Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>بعدی</Button></nav> : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {phoneDetail?.status === "loading" ? <Skeleton className="h-56" /> : null}
            {phoneDetail?.status === "error" ? <ErrorState title="تنوع‌های گوشی دریافت نشد" description="برای انتخاب دقیق تنوع، دوباره گوشی را باز کنید." /> : null}
            {phoneDetail?.status === "ready" ? (
              <Card><CardHeader><CardTitle>تنوع‌های قابل ارائه برای <span dir="ltr">{phoneDetail.data.brand} {phoneDetail.data.model}</span></CardTitle></CardHeader><CardContent>
                {phoneDetail.data.variants.length === 0 ? <EmptyState title="تنوع قابل ارائه‌ای وجود ندارد" description="این گوشی در حال حاضر تنوع فعال و قابل انتخابی ندارد." /> : <div role="listbox" aria-label="تنوع‌های گوشی" className="grid gap-3">{phoneDetail.data.variants.map((variant) => <button key={variant.id} type="button" role="option" aria-selected={selected?.id === variant.id} disabled={Boolean(variant.owned_offer)} onClick={() => { setSelected(variant); setErrors((current) => { const { variant: _variant, ...rest } = current; return rest; }); }} className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] p-4 text-right disabled:cursor-not-allowed disabled:opacity-60 aria-selected:border-[var(--accent-radish)] aria-selected:bg-[var(--surface-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"><strong>رم {variant.ram_gb ?? "—"} · حافظه {variant.storage_gb ?? "—"}</strong><span className="mt-1 block text-sm text-[var(--text-muted)]">{variant.storage_technology ?? "فناوری ذخیره‌سازی نامشخص"}{variant.owned_offer ? " · پیشنهاد موجود است" : ""}</span></button>)}</div>}
              </CardContent></Card>
            ) : null}
          </section>

          <section aria-labelledby="offer-fields-heading" className="grid gap-5 lg:sticky lg:top-24">
            {selected ? <VariantSummary variant={selected} onChange={() => setSelected(null)} /> : <EmptyState title="هنوز تنوعی انتخاب نشده است" description="ابتدا یک گوشی و سپس RAM و حافظه دقیق آن را انتخاب کن." />}
            <Card>
              <CardHeader><CardTitle><span id="offer-fields-heading">اطلاعات پیشنهاد</span></CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submit} className="grid gap-5" noValidate>
                  <Field><FieldLabel htmlFor="offer-price">قیمت در واحد مالی پروژه</FieldLabel><Input id="offer-price" inputMode="numeric" dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="35000000" aria-describedby="price-help price-error" disabled={submitting} /><FieldDescription>عدد صحیح مثبت وارد کن؛ تبدیل تومان و ریال در frontend انجام نمی‌شود.</FieldDescription><FieldError id="price-error">{errors.price}</FieldError>{normalizeInteger(price) !== null && normalizeInteger(price)! > 0 ? <p id="price-help" className="m-0 text-sm text-[var(--text-secondary)]">پیش‌نمایش: <PriceDisplay value={normalizeInteger(price)!} /></p> : null}</Field>
                  <Field><FieldLabel htmlFor="offer-quantity">موجودی فروشگاه</FieldLabel><Input id="offer-quantity" inputMode="numeric" dir="ltr" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="4" aria-describedby="quantity-help quantity-error" disabled={submitting} /><FieldDescription>صفر مجاز است؛ در این حالت پیشنهاد عمومی قابل خرید نخواهد بود.</FieldDescription><FieldError id="quantity-error">{errors.quantity}</FieldError></Field>
                  <Field><FieldLabel htmlFor="offer-description">توضیحات اختیاری</FieldLabel><Textarea id="offer-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="مثلاً نسخه گلوبال" disabled={submitting} /><FieldDescription>متن ساده ارسال می‌شود. HTML یا اطلاعات فنی ساختگی اضافه نکن.</FieldDescription><FieldError id="description-error">{errors.description}</FieldError></Field>
                  <div className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm leading-6 text-[var(--text-secondary)]">وضعیت موجود بودن جداگانه ارسال نمی‌شود؛ Django آن را از موجودی پیشنهاد و وضعیت فروشگاه محاسبه می‌کند.</div>
                  {errors.form ? <p role="alert" className="m-0 rounded-[var(--radius-control)] border border-[var(--status-danger)]/50 p-4 text-sm leading-6 text-[var(--status-danger)]">{errors.form} <Link href="/store/offers" className="font-semibold">بررسی فهرست پیشنهادها</Link></p> : null}
                  <Button type="submit" disabled={submitting || !selected || Boolean(selected?.owned_offer)} aria-describedby="create-status">{submitting ? "در حال ثبت پیشنهاد…" : "ایجاد پیشنهاد"}</Button>
                  <p id="create-status" aria-live="polite" className="m-0 text-sm text-[var(--text-muted)]">تا پاسخ تأییدشده Django دریافت نشود، هیچ پیشنهاد محلی یا خوش‌بینانه‌ای ساخته نمی‌شود.</p>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </Container>
    </main>
  );
}
