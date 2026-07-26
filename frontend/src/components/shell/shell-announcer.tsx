"use client";

import { usePathname } from "next/navigation";

export function ShellAnnouncer() {
  const pathname = usePathname();
  const label =
    pathname === "/"
      ? "خانه"
      : pathname.startsWith("/torobche")
        ? "Torobche"
        : pathname.startsWith("/stores")
          ? "فروشگاه‌ها"
          : pathname.startsWith("/basket")
            ? "سبد خرید"
            : pathname.startsWith("/account")
              ? "حساب من"
              : "صفحه";

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {label} آماده شد.
    </p>
  );
}
