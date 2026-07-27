import { checkoutSchema } from "@/lib/api/schemas";
import type { CheckoutResponse } from "@/types/api";

const PREFIX = "torob-phone:checkout-result:";

export function storeCheckoutHandoff(result: CheckoutResponse): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${PREFIX}${result.checkout_id}`, JSON.stringify(result));
}

export function readCheckoutHandoff(checkoutId: string): CheckoutResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(`${PREFIX}${checkoutId}`);
    if (!value) return null;
    const parsed = checkoutSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearCheckoutHandoff(checkoutId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${PREFIX}${checkoutId}`);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}
