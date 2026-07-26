import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { primaryNavigation } from "./navigation";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-3 py-10 sm:px-4 md:grid-cols-[1fr_auto] md:px-6 lg:px-8 xl:px-10">
        <div className="grid max-w-md gap-3">
          <Logo />
          <p className="m-0 text-sm leading-7 text-[var(--text-muted)]">
            از نیاز مبهم تا انتخاب دقیق گوشی؛ با اطلاعات واقعی و مسیر روشن.
          </p>
        </div>
        <nav
          aria-label="ناوبری پایین صفحه"
          className="flex flex-wrap items-start gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]"
        >
          {primaryNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-[var(--text-primary)] hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="m-0 text-xs text-[var(--text-muted)] md:col-span-2">
          © {new Date().getFullYear()} Torob Phone
        </p>
      </div>
    </footer>
  );
}
