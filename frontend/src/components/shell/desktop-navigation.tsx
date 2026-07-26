"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavigationActive, primaryNavigation, roleNavigation } from "./navigation";
import type { AuthRole } from "@/features/auth/types";

export function DesktopNavigation({ role }: { role: AuthRole | null }) {
  const pathname = usePathname();
  const items = role ? [...primaryNavigation, ...roleNavigation[role]] : primaryNavigation;
  return (
    <nav aria-label="ناوبری اصلی" className="hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isNavigationActive(pathname, item) ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)] focus-visible:outline-none",
            isNavigationActive(pathname, item) &&
              "bg-[var(--accent-radish-soft)] text-[var(--text-primary)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
