import type { AnchorHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Link({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "underline-offset-4 hover:text-[var(--accent-radish)] hover:underline",
        className,
      )}
      {...props}
    />
  );
}
export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 accent-[var(--accent-radish)]", className)}
      {...props}
    />
  );
}
export function Radio({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="radio"
      className={cn("size-5 accent-[var(--accent-radish)]", className)}
      {...props}
    />
  );
}
export function RadioGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="radiogroup" className={cn("grid gap-3", className)}>
      {children}
    </div>
  );
}
