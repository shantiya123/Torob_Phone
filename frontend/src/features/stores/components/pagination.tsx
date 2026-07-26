import Link from "next/link";
import { cn } from "@/lib/cn";

function pageHref(page: number, queryValues: Record<string, string>, basePath: string) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(queryValues)) {
    if (value) query.set(key, value);
  }
  query.set("page", String(page));
  return `${basePath}?${query.toString()}`;
}

export function Pagination({
  page,
  pageSize,
  total,
  search = "",
  query = {},
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  search?: string;
  query?: Record<string, string>;
  basePath: string;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const queryValues = { ...query, ...(search ? { search } : {}) };
  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {previous ? (
        <Link
          href={pageHref(previous, queryValues, basePath)}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm hover:bg-[var(--surface-interactive)] focus-visible:outline-none"
        >
          <span aria-hidden="true">→</span> قبلی
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-sm text-[var(--text-muted)]">
          <span aria-hidden="true">→</span> قبلی
        </span>
      )}
      <span className="px-3 text-sm text-[var(--text-secondary)]">
        صفحه <span dir="ltr">{page}</span> از <span dir="ltr">{totalPages}</span>
      </span>
      {next ? (
        <Link
          href={pageHref(next, queryValues, basePath)}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm hover:bg-[var(--surface-interactive)] focus-visible:outline-none",
          )}
        >
          بعدی <span aria-hidden="true">←</span>
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-sm text-[var(--text-muted)]">
          بعدی <span aria-hidden="true">←</span>
        </span>
      )}
    </nav>
  );
}
