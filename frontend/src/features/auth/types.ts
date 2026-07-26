import type { CurrentUser } from "@/types/api";

export type AuthenticatedUser =
  | (CurrentUser & { role: "customer"; is_staff: false; account_type: "customer" })
  | (CurrentUser & { role: "store"; is_staff: false; account_type: "store" })
  | (CurrentUser & { role: "staff"; is_staff: true });

export type AuthRole = AuthenticatedUser["role"];
export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "error";
export interface AuthErrorState {
  message: string;
  retryable: boolean;
}

export function resolveAuthenticatedUser(user: CurrentUser): AuthenticatedUser {
  if (user.is_staff) return { ...user, role: "staff", is_staff: true };
  if (user.account_type === "store")
    return { ...user, role: "store", is_staff: false, account_type: "store" };
  if (user.account_type === "customer")
    return { ...user, role: "customer", is_staff: false, account_type: "customer" };
  throw new Error("Authenticated user has no supported role.");
}
