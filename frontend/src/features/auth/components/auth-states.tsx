"use client";

import { Button, ErrorState, Skeleton } from "@/components/ui";
import { useAuth } from "../context/auth-context";

export function AuthLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <span className="sr-only">در حال بازیابی نشست…</span>
    </div>
  );
}

export function AuthError() {
  const { error, refreshSession } = useAuth();
  return (
    <ErrorState
      title="بازیابی نشست انجام نشد"
      description={error?.message ?? "لطفاً دوباره تلاش کنید."}
      onRetry={() => void refreshSession()}
    />
  );
}

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <Button variant="secondary" onClick={() => void logout().catch(() => undefined)}>
      خروج
    </Button>
  );
}
