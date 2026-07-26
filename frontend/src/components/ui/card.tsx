import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-level-1)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid gap-1 p-5", className)}>{children}</div>;
}
export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="m-0 text-lg font-bold">{children}</h3>;
}
export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm leading-6 text-[var(--text-muted)]">{children}</p>;
}
export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5 pt-0", className)}>{children}</div>;
}
export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("flex flex-wrap gap-3 border-t border-[var(--border-subtle)] p-5", className)}
    >
      {children}
    </div>
  );
}
