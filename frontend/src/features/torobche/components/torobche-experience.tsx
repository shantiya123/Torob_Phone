"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Container, NumberDisplay, Panel } from "@/components/ui";
import { ApiError, apiClient, type ApiClient } from "@/lib/api";
import { torobcheApi } from "@/lib/api/torobche";
import type {
  TorobcheOrdering,
  TorobcheQuerySet,
  TorobcheSearchInput,
  TorobcheSearchResponse,
} from "@/types/api";
import { clearTorobcheSession, readTorobcheSession, writeTorobcheSession } from "../session";
import type { TorobcheCharacterState, TorobcheHistoryEntry } from "../types";
import { QuerySetRail } from "./query-set-rail";
import { TorobcheCharacter } from "./torobche-character";
import { TorobcheComposer } from "./torobche-composer";
import { TorobcheResults } from "./torobche-results";

const orderingLabels: Record<TorobcheOrdering, string> = {
  newest: "تازه‌ترین",
  oldest: "قدیمی‌ترین",
  price_asc: "کمترین قیمت",
  price_desc: "بیشترین قیمت",
  battery_high: "بیشترین باتری",
  battery_low: "کمترین باتری",
};

function productError(error: unknown): string {
  if (!(error instanceof ApiError)) return "جست‌وجو انجام نشد. دوباره تلاش کنید.";
  if (error.code === "timeout") return "بررسی درخواست بیشتر از حد معمول طول کشید.";
  if (error.code === "network_error") return "ارتباط با سرویس جست‌وجو برقرار نشد.";
  if (error.status === 400) return "درخواست قابل تفسیر نبود؛ آن را کمی روشن‌تر بنویسید.";
  if (error.status === 403) return "این حساب اجازهٔ استفاده از تربچه را ندارد.";
  if (error.code === "invalid_response") return "پاسخ جست‌وجو کامل نبود. دوباره تلاش کنید.";
  return "تربچه موقتاً نتوانست جست‌وجو را کامل کند.";
}

function historyId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TorobcheExperience({ client = apiClient }: { client?: ApiClient }) {
  const router = useRouter();
  const pathname = usePathname();
  const requestController = useRef<AbortController | null>(null);
  const [characterState, setCharacterState] = useState<TorobcheCharacterState>("idle");
  const [response, setResponse] = useState<TorobcheSearchResponse | null>(null);
  const [querySet, setQuerySet] = useState<TorobcheQuerySet | null>(null);
  const [history, setHistory] = useState<TorobcheHistoryEntry[]>([]);
  const [ordering, setOrdering] = useState<TorobcheOrdering>("newest");
  const [page, setPage] = useState(1);
  const [lastRequest, setLastRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [announcement, setAnnouncement] = useState("تربچه آمادهٔ جست‌وجوست.");

  const resultFirst = response !== null;

  useEffect(() => {
    const saved = readTorobcheSession(window.sessionStorage);
    let active = true;
    if (saved)
      queueMicrotask(() => {
        if (!active) return;
        setHistory(saved.history);
        setQuerySet(saved.querySet);
        setOrdering(saved.ordering);
      });
    const controller = new AbortController();
    void torobcheApi
      .state(controller.signal, client)
      .then((state) => setQuerySet(state.query_set ?? state.queryset))
      .catch(() => {
        // A saved-state failure must not block a fresh natural-language search.
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [client]);

  useEffect(() => {
    writeTorobcheSession(window.sessionStorage, { version: 1, history, querySet, ordering });
  }, [history, ordering, querySet]);

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  const runSearch = useCallback(
    async (input: TorobcheSearchInput, requestLabel: string, requestedPage = 1) => {
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      setPending(true);
      setError(null);
      setCharacterState("thinking");
      setAnnouncement("تربچه در حال بررسی درخواست شماست.");
      try {
        const result = await torobcheApi.search(input, requestedPage, controller.signal, client);
        setResponse(result);
        setQuerySet(result.query_set ?? result.queryset);
        setOrdering(result.ordering);
        setPage(requestedPage);
        setLastRequest(requestLabel);
        const nextState: TorobcheCharacterState =
          result.count === 0 ? "empty" : result.warning ? "recovery" : "results";
        setCharacterState(nextState);
        setAnnouncement(
          result.count === 0
            ? "هیچ مدل مطابقی پیدا نشد."
            : `${result.count.toLocaleString("fa-IR")} نتیجه آماده است.${result.warning ? ` ${result.warning}` : ""}`,
        );
        if (requestLabel && requestedPage === 1)
          setHistory((current) => [
            ...current,
            {
              id: historyId(),
              request: requestLabel,
              response: result.message,
              resultCount: result.count,
              createdAt: new Date().toISOString(),
              ...(result.warning ? { warning: result.warning } : {}),
            },
          ]);
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === "aborted") return;
        if (caught instanceof ApiError && caught.code === "unauthenticated") {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        const message = productError(caught);
        setError(message);
        setCharacterState("error");
        setAnnouncement(message);
      } finally {
        if (requestController.current === controller) {
          setPending(false);
          requestController.current = null;
        }
      }
    },
    [client, pathname, router],
  );

  const submitMessage = useCallback(
    async (message: string) => runSearch({ message, ordering }, message),
    [ordering, runSearch],
  );

  const refineOrdering = async (value: TorobcheOrdering) => {
    setOrdering(value);
    if (querySet) await runSearch({ query_set: querySet, ordering: value }, lastRequest, 1);
  };

  const reset = async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setResetting(true);
    setError(null);
    try {
      await torobcheApi.reset(controller.signal, client);
      clearTorobcheSession(window.sessionStorage);
      setResponse(null);
      setQuerySet(null);
      setHistory([]);
      setOrdering("newest");
      setPage(1);
      setLastRequest("");
      setCharacterState("idle");
      setAnnouncement("جست‌وجوی قبلی پاک شد. تربچه برای یک جست‌وجوی تازه آماده است.");
      setFocusSignal((value) => value + 1);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "aborted") return;
      const message = "پاک‌کردن جست‌وجوی قبلی انجام نشد؛ اطلاعات فعلی حفظ شد.";
      setError(message);
      setCharacterState("error");
      setAnnouncement(message);
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setResetting(false);
    }
  };

  const historySummary = useMemo(() => history.slice().reverse(), [history]);

  return (
    <main id="main-content">
      <Container className="py-8 sm:py-12">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {!resultFirst ? (
          <section className="mx-auto grid max-w-4xl gap-6" aria-labelledby="torobche-heading">
            <div className="text-center">
              <p className="mb-2 text-sm font-semibold text-[var(--accent-radish)]">
                جست‌وجوی زندهٔ گوشی
              </p>
              <h1 id="torobche-heading" className="m-0 text-3xl font-bold sm:text-5xl">
                نیازت را بگو؛ مشخصات دقیق را پیدا می‌کنیم
              </h1>
              <p className="mx-auto mt-4 mb-0 max-w-2xl leading-8 text-[var(--text-secondary)]">
                تربچه درخواستت را به معیارهای قابل بررسی تبدیل می‌کند و فقط مدل‌های واقعی کاتالوگ را
                نشان می‌دهد.
              </p>
            </div>
            <TorobcheCharacter state={characterState} />
            <Panel className="grid gap-5">
              <TorobcheComposer
                pending={pending}
                defaultMessage={lastRequest}
                focusSignal={focusSignal}
                onFocusChange={(focused) => {
                  if (!pending && !error) setCharacterState(focused ? "focused" : "idle");
                }}
                onSubmit={submitMessage}
              />
              {error && (
                <div
                  role="alert"
                  className="grid gap-3 rounded-xl border border-[var(--status-danger)]/40 p-4"
                >
                  <p className="m-0">{error}</p>
                  <div className="flex flex-wrap gap-2">
                    {lastRequest && (
                      <Button variant="secondary" onClick={() => void submitMessage(lastRequest)}>
                        تلاش دوباره
                      </Button>
                    )}
                    <Link href="/stores" className="self-center text-sm underline">
                      مشاهدهٔ فروشگاه‌ها
                    </Link>
                  </div>
                </div>
              )}
            </Panel>
            {querySet && (
              <Panel>
                <QuerySetRail querySet={querySet} />
                <Button
                  className="mt-4"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    void runSearch({ query_set: querySet, ordering }, "ادامهٔ جست‌وجوی ذخیره‌شده")
                  }
                >
                  ادامه با معیارهای ذخیره‌شده
                </Button>
              </Panel>
            )}
          </section>
        ) : (
          <div className="grid gap-8">
            <section
              className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start"
              aria-labelledby="results-heading"
            >
              <TorobcheCharacter state={characterState} compact />
              <div className="grid gap-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="mb-1 text-sm text-[var(--accent-radish)]">{response.message}</p>
                    <h1 id="results-heading" className="m-0 text-3xl font-bold">
                      <NumberDisplay value={response.count} /> نتیجه برای جست‌وجوی شما
                    </h1>
                  </div>
                  <Button variant="ghost" loading={resetting} onClick={() => void reset()}>
                    جست‌وجوی تازه
                  </Button>
                </div>
                <QuerySetRail querySet={response.query_set ?? response.queryset} />
                {response.warning && (
                  <div
                    role="status"
                    className="rounded-xl border border-[var(--status-warning)]/40 bg-[var(--surface-secondary)] p-4 text-sm"
                  >
                    {response.warning}
                  </div>
                )}
              </div>
            </section>

            {response.results.length === 0 ? (
              <Panel className="grid justify-items-start gap-4">
                <h2 className="m-0 text-xl font-bold">مدل مطابقی پیدا نشد</h2>
                <p className="m-0 text-[var(--text-secondary)]">
                  معیارها خودکار تغییر نکرده‌اند. درخواستت را ویرایش کن یا یک جست‌وجوی تازه بساز.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => setFocusSignal((value) => value + 1)}>
                    ویرایش درخواست
                  </Button>
                  <Link href="/stores" className="self-center text-sm underline">
                    مشاهدهٔ فروشگاه‌ها
                  </Link>
                </div>
              </Panel>
            ) : (
              <section aria-label="مدل‌های پیدا شده">
                <TorobcheResults results={response.results} />
              </section>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                ترتیب نتیجه‌ها
                <select
                  value={ordering}
                  disabled={pending}
                  onChange={(event) => void refineOrdering(event.target.value as TorobcheOrdering)}
                  className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3"
                >
                  {Object.entries(orderingLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <nav aria-label="صفحه‌بندی نتایج" className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={!response.previous || pending}
                  onClick={() =>
                    querySet &&
                    void runSearch(
                      { query_set: querySet, ordering },
                      lastRequest,
                      Math.max(1, page - 1),
                    )
                  }
                >
                  صفحهٔ قبل
                </Button>
                <span className="text-sm text-[var(--text-muted)]">
                  صفحهٔ {page.toLocaleString("fa-IR")}
                </span>
                <Button
                  variant="secondary"
                  disabled={!response.next || pending}
                  onClick={() =>
                    querySet &&
                    void runSearch({ query_set: querySet, ordering }, lastRequest, page + 1)
                  }
                >
                  صفحهٔ بعد
                </Button>
              </nav>
            </div>

            <Panel className="grid gap-5">
              <h2 className="m-0 text-xl font-bold">جست‌وجو را دقیق‌تر کن</h2>
              <TorobcheComposer
                pending={pending}
                defaultMessage=""
                compact
                focusSignal={focusSignal}
                onFocusChange={() => undefined}
                onSubmit={submitMessage}
              />
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[var(--status-danger)]/40 p-4"
                >
                  {error}
                </div>
              )}
            </Panel>
          </div>
        )}

        {historySummary.length > 0 && (
          <details className="mx-auto mt-8 max-w-4xl rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            <summary className="cursor-pointer px-5 py-4 font-semibold">
              درخواست‌های همین نشست ({historySummary.length.toLocaleString("fa-IR")})
            </summary>
            <ol className="m-0 grid gap-3 border-t border-[var(--border-subtle)] p-5">
              {historySummary.map((entry) => (
                <li key={entry.id} className="grid gap-1 text-sm">
                  <strong>{entry.request}</strong>
                  <span className="text-[var(--text-secondary)]">{entry.response}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {entry.resultCount.toLocaleString("fa-IR")} نتیجه
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </Container>
    </main>
  );
}
