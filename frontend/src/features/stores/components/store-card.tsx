import Link from "next/link";
import type { PublicStoreListItem } from "@/types/api";
import { StoreLogo } from "@/features/home/components/store-logo";

export function StoreCard({ store }: { store: PublicStoreListItem }) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className="group flex min-h-36 items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-level-1)] transition-[background-color,border-color,transform] duration-[var(--duration-standard)] hover:-translate-y-1 hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] focus-visible:outline-none motion-reduce:transform-none"
    >
      <StoreLogo src={store.logo} name={store.name} />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-lg font-bold">{store.name}</span>
        <span dir="ltr" className="mt-2 block truncate text-sm text-[var(--text-muted)]">
          {store.slug}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="text-xl text-[var(--accent-radish)] transition-transform duration-[var(--duration-fast)] group-hover:-translate-x-1 motion-reduce:transform-none"
      >
        ←
      </span>
    </Link>
  );
}
