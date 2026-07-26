"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useState } from "react";
import { resolveMediaUrl } from "@/lib/media";

const passthroughLoader = ({ src }: ImageLoaderProps) => src;

export function StoreLogo({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const safeSource = resolveMediaUrl(src);
  return (
    <Image
      loader={passthroughLoader}
      unoptimized
      src={!failed && safeSource ? safeSource : "/icon.svg"}
      alt={safeSource && !failed ? `لوگوی ${name}` : ""}
      width={64}
      height={64}
      onError={() => setFailed(true)}
      className="size-16 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] object-cover"
    />
  );
}
