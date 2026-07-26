import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Torob Phone، صفحهٔ اصلی"
      className="group inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-1 focus-visible:outline-none"
    >
      <Image
        src="/icon.svg"
        alt=""
        width={34}
        height={34}
        priority
        className="size-8 rounded-[10px] transition-transform duration-[var(--duration-fast)] group-hover:scale-105 sm:size-9"
      />
      {!compact && (
        <span className="grid leading-none">
          <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
            Torob Phone
          </span>
          <span className="mt-1 text-[10px] text-[var(--text-muted)]">از نیاز تا انتخاب دقیق</span>
        </span>
      )}
    </Link>
  );
}
