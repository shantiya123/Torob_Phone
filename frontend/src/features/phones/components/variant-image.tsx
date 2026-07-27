import Image, { type ImageLoaderProps } from "next/image";
import type { DeviceVariantDetail } from "@/types/api";
import { resolveMediaUrl } from "@/lib/media";

const passthroughLoader = ({ src }: ImageLoaderProps) => src;

export function VariantImage({ variant }: { variant: DeviceVariantDetail }) {
  const source = resolveMediaUrl(variant.image_url) ?? "/icon.svg";
  return (
   <Image
  unoptimized
  src={source}
  alt={`${variant.brand} ${variant.model_name}`}
  width={640}
  height={640}
  priority
  className="size-full object-contain"
/>
  );
}
