"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "@/features/auth/context/auth-context";
import { catalogApi } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import type { PersonalizedExplanationResponse } from "@/types/api";

const inFlightRequests = new Map<number, Promise<PersonalizedExplanationResponse>>();

function loadExplanation(variantId: number) {
  const existing = inFlightRequests.get(variantId);
  if (existing) return existing;
  const request = catalogApi.personalizedExplanation(variantId).finally(() => {
    if (inFlightRequests.get(variantId) === request) inFlightRequests.delete(variantId);
  });
  inFlightRequests.set(variantId, request);
  return request;
}

function ExplanationSkeleton() {
  return (
    <div aria-busy="true" aria-label="تربچه در حال آماده‌سازی تحلیل شخصی است" className="grid gap-4">
      <Skeleton className="h-6 w-52 max-w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function SafeExplanationText({ value }: { value: string }) {
  const blocks = useMemo(() => {
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    const output: Array<
      | { kind: "heading"; text: string }
      | { kind: "paragraph"; text: string }
      | { kind: "list"; items: string[] }
    > = [];
    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => {
      const text = paragraph.join(" ").trim();
      if (text) output.push({ kind: "paragraph", text });
      paragraph = [];
    };
    const flushList = () => {
      if (list.length) output.push({ kind: "list", items: list });
      list = [];
    };

    for (const sourceLine of lines) {
      const line = sourceLine.trim();
      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }
      const heading = line.match(/^\*\*(.+)\*\*$/)?.[1]?.trim();
      if (heading) {
        flushParagraph();
        flushList();
        output.push({ kind: "heading", text: heading });
      } else if (/^[-•]\s+/.test(line)) {
        flushParagraph();
        list.push(line.replace(/^[-•]\s+/, ""));
      } else {
        flushList();
        paragraph.push(line.replace(/\*\*/g, ""));
      }
    }
    flushParagraph();
    flushList();
    return output;
  }, [value]);

  return (
    <div className="grid gap-4 text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={`${block.kind}-${index}`} className="m-0 text-base font-bold text-[var(--text-primary)] sm:text-lg">
              {block.text}
            </h3>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={`${block.kind}-${index}`} className="m-0 grid list-disc gap-2 pe-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={`${block.kind}-${index}`} className="m-0">{block.text}</p>;
      })}
    </div>
  );
}

export function PersonalizedExplanationSection({ variantId }: { variantId: number }) {
  const { status, user, error: authError, refreshSession } = useAuth();
  const [result, setResult] = useState<PersonalizedExplanationResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const supportedRole = user?.role === "customer" || user?.role === "store";

  useEffect(() => {
    if (status !== "authenticated" || !supportedRole) return;
    let active = true;
    setResult(null);
    setError(null);
    void loadExplanation(variantId)
      .then((response) => {
        if (!active) return;
        if (response.phone_id !== variantId) {
          setError(
            new ApiError({
              code: "invalid_response",
              status: 200,
              message: "Explanation response did not match the requested variant.",
            }),
          );
          return;
        }
        setResult(response);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught);
      });
    return () => {
      active = false;
    };
  }, [status, supportedRole, variantId, requestVersion]);

  const retry = () => setRequestVersion((version) => version + 1);
  const contextRequired =
    error instanceof ApiError &&
    error.code === "conflict" &&
    error.backendCode === "torobche_context_required";
  const invalidResponse = error instanceof ApiError && error.code === "invalid_response";
  const explanationUnavailable = result !== null && result.description === null;

  return (
    <section
      aria-labelledby="personalized-explanation-heading"
      className="mt-12 rounded-[var(--radius-stage)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5 sm:p-7"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">تربچه برای شما</p>
          <h2 id="personalized-explanation-heading" className="m-0 text-2xl font-bold">
            تحلیل شخصی تربچه
          </h2>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
            این تحلیل بر اساس آخرین نیازهایی است که با تربچه مطرح کرده‌اید و ممکن است نقاط قوت و محدودیت‌های این پیکربندی را هم‌زمان نشان دهد.
          </p>
        </div>
        {result?.description && (
          <Button type="button" variant="secondary" onClick={retry}>
            به‌روزرسانی تحلیل
          </Button>
        )}
      </div>

      {status === "initializing" ? (
        <ExplanationSkeleton />
      ) : status === "unauthenticated" ? (
        <div className="grid gap-4">
          <p className="m-0 leading-7 text-[var(--text-secondary)]">
            برای دیدن تحلیل شخصی تربچه، ابتدا وارد حساب خود شوید.
          </p>
          <div>
            <Link
              href={`/login?returnTo=${encodeURIComponent(`/phones/${variantId}`)}`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 font-semibold text-white focus-visible:outline-none"
            >
              ورود و مشاهده تحلیل شخصی
            </Link>
          </div>
        </div>
      ) : status === "error" ? (
        <ErrorState
          title="وضعیت حساب مشخص نشد"
          description={authError?.message ?? "برای بررسی دسترسی تحلیل شخصی، نشست حساب را دوباره بازیابی کنید."}
          onRetry={() => void refreshSession()}
        />
      ) : user?.role === "staff" ? (
        <p className="m-0 leading-7 text-[var(--text-secondary)]">
          تحلیل شخصی تربچه برای حساب‌های مشتری و فروشگاه در دسترس است.
        </p>
      ) : !result && !error ? (
        <div className="grid gap-3" role="status" aria-live="polite">
          <p className="m-0 text-sm text-[var(--text-muted)]">
            تربچه در حال مقایسه این گوشی با نیازهای شماست.
          </p>
          <ExplanationSkeleton />
        </div>
      ) : contextRequired ? (
        <div className="grid gap-4">
          <div role="status">
            <h3 className="m-0 text-lg font-bold">ابتدا نیازهای خود را با تربچه مشخص کنید</h3>
            <p className="mb-0 mt-2 leading-7 text-[var(--text-secondary)]">
              هنوز نیاز فعالی برای حساب شما ذخیره نشده است. پس از گفت‌وگو با تربچه، به همین گوشی برگردید و تحلیل را تازه کنید.
            </p>
          </div>
          <div>
            <Link
              href="/torobche"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-4 font-semibold text-white focus-visible:outline-none"
            >
              گفت‌وگو با تربچه
            </Link>
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title={invalidResponse ? "پاسخ تحلیل شخصی معتبر نبود" : "تحلیل شخصی فعلاً در دسترس نیست"}
          description={
            invalidResponse
              ? "متن شخصی‌سازی‌شده نمایش داده نشد، چون پاسخ با قرارداد این گوشی سازگار نبود."
              : error instanceof ApiError && error.code === "not_found"
                ? "برای این پیکربندی، تحلیل شخصی در حال حاضر قابل دریافت نیست؛ مشخصات و پیشنهادهای گوشی همچنان در دسترس‌اند."
                : "مشخصات گوشی و پیشنهادهای فروشگاه‌ها در دسترس‌اند. برای دریافت دوباره تحلیل تربچه تلاش کنید."
          }
          onRetry={retry}
        />
      ) : explanationUnavailable ? (
        <ErrorState
          title="تحلیل شخصی فعلاً در دسترس نیست"
          description="سرویس تولید تحلیل موقتاً پاسخ نداده است. هیچ نتیجه یا توصیه‌ای از طرف frontend جایگزین نشده است."
          onRetry={retry}
        />
      ) : result?.description ? (
        <div role="status" aria-live="polite">
          <SafeExplanationText value={result.description} />
        </div>
      ) : null}
    </section>
  );
}
