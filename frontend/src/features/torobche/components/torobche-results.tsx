import Image, { type ImageLoaderProps } from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, PriceDisplay } from "@/components/ui";
import { resolveMediaUrl } from "@/lib/media";
import type { TorobcheResult } from "@/types/api";

const passthroughLoader = ({ src }: ImageLoaderProps) => src;

export function TorobcheResults({ results }: { results: TorobcheResult[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {results.map((variant) => {
        const source = resolveMediaUrl(variant.image_url) ?? "/icon.svg";
        return (
          <Card key={variant.id} className="overflow-hidden">
            <div className="grid aspect-[4/3] place-items-center bg-[var(--surface-secondary)] p-5">
              <Image
                loader={passthroughLoader}
                unoptimized
                src={source}
                alt={`${variant.brand} ${variant.model_name}`}
                width={320}
                height={240}
                className="size-full object-contain"
              />
            </div>
            <CardHeader>
              <p className="m-0 text-xs text-[var(--text-muted)]">{variant.brand}</p>
              <CardTitle>
                <bdi dir="ltr">{variant.model_name}</bdi>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                {variant.ram_gb !== null && <span>{variant.ram_gb}GB رم</span>}
                {variant.storage_gb !== null && <span>{variant.storage_gb}GB حافظه</span>}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="m-0 text-xs text-[var(--text-muted)]">شروع قیمت فعلی</p>
                  <p className="mt-1 mb-0 font-bold">
                    {variant.minimum_available_price === null ? (
                      "بدون پیشنهاد فعال"
                    ) : (
                      <PriceDisplay value={variant.minimum_available_price} />
                    )}
                  </p>
                </div>
                <Link
                  href={`/phones/${variant.id}`}
                  className="rounded-[var(--radius-control)] bg-[var(--accent-radish)] px-3 py-2 text-sm font-semibold text-[var(--text-inverse)]"
                >
                  مشاهده
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
