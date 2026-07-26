"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { RouteTransition } from "./route-transition";
import { ShellAnnouncer } from "./shell-announcer";

const shellExcludedPrefixes = ["/login", "/register", "/dev/ui"];

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isShellExcluded = shellExcludedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isShellExcluded) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ShellAnnouncer />
      <RouteTransition>
        <div className="flex-1">{children}</div>
      </RouteTransition>
      <SiteFooter />
    </div>
  );
}
