"use client";

import { StoreRouteError } from "@/features/stores/components/store-route-error";

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StoreRouteError reset={reset} />;
}
