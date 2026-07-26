import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[var(--radius-control)] bg-[var(--skeleton)]",
        className,
      )}
    />
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] p-8 text-center">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {description && (
        <p className="m-0 max-w-prose text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
export function ErrorState({
  title = "خطایی رخ داد",
  description = "لطفاً دوباره تلاش کنید.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-center gap-3 rounded-[var(--radius-card)] border border-[var(--status-danger)]/50 bg-[var(--surface-secondary)] p-8 text-center"
    >
      <h2 className="m-0 text-lg font-bold text-[var(--status-danger)]">{title}</h2>
      <p className="m-0 text-sm text-[var(--text-secondary)]">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          تلاش دوباره
        </Button>
      )}
    </div>
  );
}
