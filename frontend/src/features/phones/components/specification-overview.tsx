import type { DeviceVariantDetail } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const labels: Record<string, string> = {
  performance: "عملکرد",
  displays: "نمایشگر",
  battery: "باتری",
  cameras: "دوربین",
  connectivity: "ارتباطات",
  physical: "بدنه",
  software: "نرم‌افزار",
  benchmarks: "بنچمارک‌ها",
};

function readable(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (Array.isArray(value)) {
    const values = value.map(readable).filter((item): item is string => Boolean(item));
    return values.length ? values.join("، ") : null;
  }
  if (typeof value === "object") {
    const values = Object.entries(value)
      .map(([key, child]) => {
        const rendered = readable(child);
        return rendered ? `${key}: ${rendered}` : null;
      })
      .filter((item): item is string => Boolean(item));
    return values.length ? values.join(" · ") : null;
  }
  return null;
}

function Group({ name, value }: { name: string; value: unknown }) {
  const text = readable(value);
  if (!text) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels[name] ?? name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="m-0 text-sm leading-7 text-[var(--text-secondary)]">{text}</p>
      </CardContent>
    </Card>
  );
}

export function SpecificationOverview({ variant }: { variant: DeviceVariantDetail }) {
  const groups = [
    ["performance", variant.performance],
    ["displays", variant.displays],
    ["battery", variant.battery],
    ["cameras", variant.cameras],
    ["connectivity", variant.connectivity],
    ["physical", variant.physical],
    ["software", variant.software],
    ["benchmarks", variant.benchmarks],
  ] as const;
  const available = groups.filter(([, value]) => readable(value));
  if (!available.length) return null;
  return (
    <section aria-labelledby="specifications-heading" className="mt-12">
      <h2 id="specifications-heading" className="mb-5 text-2xl font-bold">
        مشخصات فنی
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {available.map(([name, value]) => (
          <Group key={name} name={name} value={value} />
        ))}
      </div>
    </section>
  );
}
