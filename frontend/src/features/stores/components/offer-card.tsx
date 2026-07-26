import Link from "next/link";
import Image, { type ImageLoaderProps } from "next/image";
import type { PublicOffer } from "@/types/api";
import { Badge, Card, CardContent, CardHeader, CardTitle, PriceDisplay } from "@/components/ui";
import { resolveMediaUrl } from "@/lib/media";

const passthroughLoader = ({ src }: ImageLoaderProps) => src;

function VariantImage({ offer }: { offer: PublicOffer }) {
  const mediaUrl = resolveMediaUrl(offer.device_variant.image_url);
  const source = mediaUrl ?? "/icon.svg";
  const alt = mediaUrl ? `تصویر ${offer.device_variant.model_name}` : "";
  return (
    <Image
      loader={passthroughLoader}
      unoptimized
      src={source}
      alt={alt}
      width={180}
      height={180}
      className="size-full object-contain"
    />
  );
}

export function OfferCard({ offer }: { offer: PublicOffer }) {
  const variant = offer.device_variant;
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-[border-color,transform] duration-[var(--duration-standard)] hover:-translate-y-1 hover:border-[var(--border-strong)] motion-reduce:transform-none">
      <Link
        href={`/phones/${variant.id}`}
        className="block focus-visible:outline-none"
        aria-label={`مشاهده ${variant.brand} ${variant.model_name}`}
      >
        <div className="grid aspect-[4/3] place-items-center border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-6">
          <VariantImage offer={offer} />
        </div>
      </Link>
      <CardHeader className="gap-2">
        <CardTitle>
          <span dir="ltr" className="inline-block">
            {variant.brand} {variant.model_name}
          </span>
        </CardTitle>
        <p className="m-0 text-sm text-[var(--text-muted)]">
          {variant.ram_gb ? `${variant.ram_gb}GB RAM` : "RAM نامشخص"}
          {" · "}
          {variant.storage_gb ? `${variant.storage_gb}GB` : "حافظه نامشخص"}
        </p>
      </CardHeader>
      <CardContent className="mt-auto grid gap-3">
        <PriceDisplay value={offer.price} />
        <Badge tone={offer.available ? "success" : "warning"}>
          {offer.available ? "موجود" : "ناموجود"}
        </Badge>
        {offer.description && (
          <p className="m-0 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {offer.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
