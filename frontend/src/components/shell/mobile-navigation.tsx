"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui";
import { isNavigationActive, primaryNavigation, roleNavigation } from "./navigation";
import type { AuthRole } from "@/features/auth/types";

export function MobileNavigation({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: AuthRole | null;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const items = role ? [...primaryNavigation, ...roleNavigation[role]] : primaryNavigation;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="بستن منوی ناوبری"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={onClose}
      />
      <aside
        id="mobile-navigation"
        ref={panelRef}
        tabIndex={-1}
        aria-label="منوی موبایل"
        className="absolute inset-block-0 inset-inline-start-0 flex w-[min(88vw,360px)] flex-col border-e border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-level-3)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <span className="text-lg font-bold">ناوبری</span>
          <IconButton label="بستن منو" variant="ghost" onClick={onClose}>
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
          </IconButton>
        </div>
        <nav aria-label="ناوبری موبایل" className="mt-4 grid gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isNavigationActive(pathname, item) ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center rounded-[var(--radius-control)] px-4 text-base text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)]",
                isNavigationActive(pathname, item) &&
                  "bg-[var(--accent-radish-soft)] text-[var(--text-primary)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
          جست‌وجوی دقیق، انتخاب مطمئن
        </div>
      </aside>
    </div>
  );
}
