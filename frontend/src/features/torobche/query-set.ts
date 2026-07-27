import type { NumericRange, TorobcheQuerySet } from "@/types/api";

export interface ActiveCriterion {
  path: string;
  label: string;
  value: string;
}

const labels: Record<string, string> = {
  brand: "برند",
  model: "مدل",
  release_date: "تاریخ عرضه",
  "performance.chipset": "تراشه",
  "performance.cpu": "پردازنده",
  "performance.gpu": "پردازندهٔ گرافیکی",
  "performance.storage_type": "نوع حافظه",
  "performance.variants.ram_gb": "رم",
  "performance.variants.storage_gb": "حافظه",
  "display.size_inches": "اندازهٔ نمایشگر",
  "display.technology": "فناوری نمایشگر",
  "display.refresh_rate_hz": "نرخ نوسازی",
  "display.brightness_peak_nits": "روشنایی",
  "display.hdr": "HDR",
  "battery.capacity_mah": "باتری",
  "battery.charging_w": "شارژ",
  "battery.wireless_charging": "شارژ بی‌سیم",
  "camera.main_mp": "دوربین اصلی",
  "camera.selfie_mp": "دوربین سلفی",
  "camera.ois": "لرزش‌گیر اپتیکال",
  "connectivity.5g": "شبکهٔ 5G",
  "connectivity.nfc": "NFC",
  "physical.weight_g": "وزن",
  "physical.ip_rating": "مقاومت",
  "software.os": "سیستم‌عامل",
  price: "بازهٔ قیمت",
};

const units: Record<string, string> = {
  "performance.variants.ram_gb": "GB",
  "performance.variants.storage_gb": "GB",
  "display.size_inches": "اینچ",
  "display.refresh_rate_hz": "Hz",
  "display.brightness_peak_nits": "nit",
  "battery.capacity_mah": "mAh",
  "battery.charging_w": "W",
  "camera.main_mp": "MP",
  "camera.selfie_mp": "MP",
  "physical.weight_g": "g",
  price: "تومان",
};

function isRange(value: unknown): value is NumericRange {
  return typeof value === "object" && value !== null && "min" in value && "max" in value;
}

function formatValue(path: string, value: string | boolean | NumericRange): string | null {
  if (typeof value === "boolean") return value ? "دارد" : "ندارد";
  if (typeof value === "string") return value;
  if (value.min === null && value.max === null) return null;
  const unit = units[path] ? ` ${units[path]}` : "";
  if (value.min !== null && value.max !== null)
    return `${value.min.toLocaleString("fa-IR")} تا ${value.max.toLocaleString("fa-IR")}${unit}`;
  if (value.min !== null) return `از ${value.min.toLocaleString("fa-IR")}${unit}`;
  return `تا ${value.max?.toLocaleString("fa-IR")}${unit}`;
}

export function activeCriteria(querySet: TorobcheQuerySet): ActiveCriterion[] {
  const criteria: ActiveCriterion[] = [];
  function walk(value: unknown, path: string) {
    if (value === null || path.startsWith("source")) return;
    if (typeof value === "string" || typeof value === "boolean" || isRange(value)) {
      const formatted = formatValue(path, value);
      if (formatted)
        criteria.push({
          path,
          label: labels[path] ?? path.split(".").at(-1) ?? path,
          value: formatted,
        });
      return;
    }
    if (typeof value === "object")
      Object.entries(value).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
  }
  walk(querySet, "");
  return criteria;
}
