import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function HomeLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-base font-semibold transition-[background-color,color,transform,border-color] duration-[var(--duration-fast)] focus-visible:outline-none active:translate-y-px motion-reduce:transform-none",
        variant === "primary" &&
          "bg-[var(--accent-radish)] text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)]",
        variant === "secondary" &&
          "border border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-interactive)]",
        variant === "quiet" && "text-[var(--text-primary)] hover:bg-[var(--surface-interactive)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
