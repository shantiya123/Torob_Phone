import Link from "next/link";
import type { PublicStoreDetail, PublicStoreListItem } from "@/types/api";
import { Container, DateDisplay } from "@/components/ui";
import { StoreLogo } from "@/features/home/components/store-logo";

export function StoreIdentity({
  store,
  showBack = true,
}: {
  store: PublicStoreDetail | PublicStoreListItem;
  showBack?: boolean;
}) {
  const detail = "description" in store;
  return (
    <section
      aria-labelledby="store-title"
      className="border-b border-[var(--border-subtle)] py-10 sm:py-14"
    >
      <Container>
        {showBack && (
          <nav aria-label="مسیر صفحه" className="mb-8 text-sm text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--text-primary)] hover:underline">
              خانه
            </Link>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <Link href="/stores" className="hover:text-[var(--text-primary)] hover:underline">
              فروشگاه‌ها
            </Link>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span aria-current="page">{store.name}</span>
          </nav>
        )}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <StoreLogo src={store.logo} name={store.name} />
          <div className="min-w-0">
            <h1 id="store-title" className="break-words text-3xl font-bold sm:text-4xl">
              {store.name}
            </h1>
            <p dir="ltr" className="mt-2 break-all text-sm text-[var(--text-muted)]">
              {store.slug}
            </p>
            {detail && (
              <>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-base leading-8 text-[var(--text-secondary)]">
                  {store.description || "این فروشگاه هنوز توضیح عمومی اضافه نکرده است."}
                </p>
                {store.created_at && (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    عضویت از <DateDisplay value={store.created_at} />
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
