"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { IconButton } from "@/components/ui";
import { useAuth } from "@/features/auth/context/auth-context";
import { destinationFor } from "@/features/auth/utils/redirect";
import { Logo } from "@/components/brand/logo";
import { TorobcheMark } from "@/components/brand/torobche-mark";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";

export function SiteHeader() {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = status === "authenticated" ? (user?.role ?? null) : null;
  const accountHref =
    role === "customer"
      ? "/account"
      : role
        ? destinationFor(role, null)
        : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky inset-block-start-0 z-20 border-b border-[var(--border-subtle)] bg-[color:rgb(11_13_16_/_92%)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1440px] items-center gap-3 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-2">
          <IconButton
            label="باز کردن منوی موبایل"
            variant="ghost"
            className="lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(true)}
          >
            <span aria-hidden="true" className="text-xl">
              ☰
            </span>
          </IconButton>
          <Logo />
        </div>
        <DesktopNavigation role={role} />
        <div className="ms-auto flex items-center gap-1">
          <TorobcheMark />
          {role === "customer" && (
            <Link
              href="/basket"
              className="hidden min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)] sm:inline-flex"
            >
              سبد خرید
            </Link>
          )}
          {status === "initializing" ? (
            <span className="hidden h-9 w-20 animate-pulse rounded-[var(--radius-control)] bg-[var(--skeleton)] sm:block" />
          ) : (
            <Link
              href={accountHref}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-interactive)] focus-visible:outline-none"
            >
              {role === "store"
                ? "داشبورد"
                : role === "staff"
                  ? "بررسی‌ها"
                  : role === "customer"
                    ? "حساب من"
                    : "ورود"}
            </Link>
          )}
        </div>
      </div>
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} role={role} />
    </header>
  );
}
