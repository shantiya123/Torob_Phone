import type { AuthRole } from "@/features/auth/types";

export type ShellNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryNavigation: ShellNavItem[] = [
  { href: "/", label: "خانه", exact: true },
  { href: "/torobche", label: "Torobche" },
  { href: "/stores", label: "فروشگاه‌ها" },
];

export const roleNavigation: Record<AuthRole, ShellNavItem[]> = {
  customer: [
    { href: "/basket", label: "سبد خرید" },
    { href: "/account", label: "حساب من" },
  ],
  store: [{ href: "/store/dashboard", label: "داشبورد فروشگاه" }],
  staff: [{ href: "/staff/store-reviews", label: "بررسی فروشگاه‌ها" }],
};

export function isNavigationActive(pathname: string, item: ShellNavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
