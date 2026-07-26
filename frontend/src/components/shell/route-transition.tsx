"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "auto";
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      document.documentElement.dataset.routeTransition = "enter";
      const timeout = window.setTimeout(() => {
        delete document.documentElement.dataset.routeTransition;
      }, 320);
      return () => {
        window.clearTimeout(timeout);
        window.history.scrollRestoration = previousRestoration;
      };
    }
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, [pathname]);

  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  );
}
