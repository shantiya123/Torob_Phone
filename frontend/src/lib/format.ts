import { isolateBidi } from "@/lib/rtl";

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });

export function formatNumber(value: number): string {
  return isolateBidi(faNumber.format(value));
}

export function formatPrice(value: number, currency = "تومان"): string {
  return `${formatNumber(value)} ${currency}`;
}

export function formatDate(value: Date | string | number): string {
  return isolateBidi(faDate.format(new Date(value)));
}
