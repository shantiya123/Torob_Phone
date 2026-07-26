import { formatDate, formatNumber, formatPrice } from "@/lib/format";

export function NumberDisplay({ value }: { value: number }) {
  return (
    <span dir="ltr" className="tabular-nums">
      {formatNumber(value)}
    </span>
  );
}
export function PriceDisplay({ value, currency = "تومان" }: { value: number; currency?: string }) {
  return (
    <span dir="ltr" className="tabular-nums">
      {formatPrice(value, currency)}
    </span>
  );
}
export function DateDisplay({ value }: { value: Date | string | number }) {
  return (
    <time dir="ltr" dateTime={new Date(value).toISOString()}>
      {formatDate(value)}
    </time>
  );
}
