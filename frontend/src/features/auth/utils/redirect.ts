import type { AuthRole } from "../types";

export const roleDestinations: Record<AuthRole, string> = {
  customer: "/",
  store: "/store/dashboard",
  staff: "/staff/store-reviews",
};

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    const url = new URL(decoded, "http://localhost");
    if (url.origin !== "http://localhost") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function destinationFor(role: AuthRole, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (!safe) return roleDestinations[role];
  if (role === "customer" && (safe.startsWith("/store") || safe.startsWith("/staff")))
    return roleDestinations.customer;
  if (role === "store" && safe.startsWith("/staff")) return roleDestinations.store;
  if (role === "staff" && safe.startsWith("/store")) return roleDestinations.staff;
  return safe;
}
