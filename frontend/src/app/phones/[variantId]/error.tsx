"use client";

import { StoreRouteError } from "@/features/stores/components/store-route-error";

export default function VariantError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StoreRouteError reset={reset} />;
}
