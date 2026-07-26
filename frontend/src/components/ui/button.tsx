"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent-radish)] text-[var(--text-inverse)] hover:bg-[var(--accent-radish-deep)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-interactive)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)]",
  danger: "bg-[var(--status-danger)] text-[var(--text-inverse)] hover:brightness-110",
  link: "text-[var(--accent-radish)] underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base",
  lg: "min-h-[52px] px-5 text-lg",
  icon: "size-11",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  success?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    success = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors duration-[var(--duration-fast)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "در حال پردازش…" : success ? "انجام شد" : children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "size"> & { label: string }
>(function IconButton({ label, className, children, ...props }, ref) {
  return (
    <Button ref={ref} {...props} size="icon" className={className} aria-label={label}>
      {children}
    </Button>
  );
});
