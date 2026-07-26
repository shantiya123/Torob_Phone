import Link from "next/link";
import { Container, EmptyState } from "@/components/ui";
import type { HomeStoreState } from "../types";
import { HomeLink } from "./home-link";
import { StoreLogo } from "./store-logo";

export function FeaturedStores({ state }: { state: HomeStoreState }) {
  return (
    <section aria-labelledby="stores-title" className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">
              فروشگاه‌های فعال
            </p>
            <h2 id="stores-title" className="mt-3 text-3xl font-bold sm:text-4xl">
              از بین فروشگاه‌های قابل مشاهده انتخاب کن
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              این فهرست فقط هویت عمومی فروشگاه‌های فعال را نمایش می‌دهد.
            </p>
          </div>
          <HomeLink href="/stores" variant="secondary">
            همه فروشگاه‌ها
          </HomeLink>
        </div>

        {state.status === "ready" && (
          <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {state.stores.map((store) => (
              <li key={store.id}>
                <Link
                  href={`/stores/${store.id}`}
                  className="group flex min-h-32 items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-level-1)] transition-[border-color,transform,background-color] duration-[var(--duration-standard)] hover:-translate-y-1 hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] focus-visible:outline-none motion-reduce:transform-none"
                >
                  <StoreLogo src={store.logo} name={store.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">{store.name}</span>
                    <span className="mt-2 block text-sm text-[var(--text-muted)]">
                      مشاهده صفحه عمومی
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-xl text-[var(--accent-radish)] transition-transform duration-[var(--duration-fast)] group-hover:-translate-x-1 motion-reduce:transform-none"
                  >
                    ←
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {state.status === "empty" && (
          <div className="mt-10">
            <EmptyState
              title="هنوز فروشگاه عمومی فعالی وجود ندارد"
              description="می‌توانی فعلاً با Torobche مسیر انتخاب گوشی را شروع کنی."
              action={<HomeLink href="/torobche">شروع با Torobche</HomeLink>}
            />
          </div>
        )}

        {state.status === "error" && (
          <div
            role="alert"
            className="mt-10 grid gap-3 rounded-[var(--radius-card)] border border-[var(--status-danger)]/50 bg-[var(--surface-primary)] p-6"
          >
            <h3 className="m-0 text-lg font-bold">فروشگاه‌ها فعلاً قابل دریافت نیستند</h3>
            <p className="m-0 text-sm leading-7 text-[var(--text-secondary)]">
              بخش‌های اصلی صفحه همچنان در دسترس‌اند. برای تلاش دوباره وارد فهرست فروشگاه‌ها شو.
            </p>
            <HomeLink href="/stores" variant="secondary" className="justify-self-start">
              رفتن به فروشگاه‌ها
            </HomeLink>
          </div>
        )}
      </Container>
    </section>
  );
}
