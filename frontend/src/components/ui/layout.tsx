import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export function Section({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-8 md:py-12", className)} {...props}>
      {children}
    </section>
  );
}
export function Surface({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] bg-[var(--surface-primary)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-level-1)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
export function Stack({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      {children}
    </div>
  );
}
export function Cluster({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)} {...props}>
      {children}
    </div>
  );
}
export function Grid({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)} {...props}>
      {children}
    </div>
  );
}
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
