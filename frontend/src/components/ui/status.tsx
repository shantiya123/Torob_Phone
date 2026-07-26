import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatusTone = "info" | "success" | "warning" | "danger";
const toneClasses: Record<StatusTone, string> = {
  info: "border-[var(--status-info)]/50 text-[var(--status-info)]",
  success: "border-[var(--status-success)]/50 text-[var(--status-success)]",
  warning: "border-[var(--status-warning)]/50 text-[var(--status-warning)]",
  danger: "border-[var(--status-danger)]/50 text-[var(--status-danger)]",
};

export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-[var(--radius-pill)] border px-2.5 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-card)] border bg-[var(--surface-secondary)] p-4",
        toneClasses[tone],
      )}
    >
      {title && <strong className="block">{title}</strong>}
      <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
    </div>
  );
}

export function StatusMessage({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <p
      className={cn(
        "m-0 text-sm leading-6",
        toneClasses[tone].split(" ").find((item) => item.startsWith("text-")),
      )}
    >
      {children}
    </p>
  );
}
