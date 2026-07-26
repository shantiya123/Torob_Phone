import Link from "next/link";
import { Field, FieldLabel, Input } from "@/components/ui";

export function StoreSearch({ value }: { value: string }) {
  return (
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
      <Field className="flex-1">
        <FieldLabel htmlFor="store-search">جست‌وجوی فروشگاه</FieldLabel>
        <Input
          id="store-search"
          name="search"
          defaultValue={value}
          maxLength={100}
          placeholder="مثلاً Mobile Center"
          dir="auto"
          autoComplete="organization"
        />
      </Field>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-5 font-semibold text-[var(--text-inverse)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--accent-radish-deep)] focus-visible:outline-none"
      >
        جست‌وجو
      </button>
      {value && (
        <Link
          href="/stores"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] focus-visible:outline-none"
        >
          پاک کردن
        </Link>
      )}
    </form>
  );
}
