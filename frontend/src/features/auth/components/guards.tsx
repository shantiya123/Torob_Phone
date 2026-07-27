"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Panel } from "@/components/ui";
import { AuthError, AuthLoading } from "./auth-states";
import { useAuth } from "../context/auth-context";
import type { AuthRole } from "../types";
import { destinationFor } from "../utils/redirect";

function Forbidden({ role }: { role: AuthRole }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <Panel className="grid gap-4 text-center">
      <h1 className="m-0 text-2xl font-bold">دسترسی مجاز نیست</h1>
      <p className="m-0 text-[var(--text-secondary)]">این بخش برای نقش {role} در دسترس نیست.</p>
      <div className="flex justify-center gap-3">
        <Button
          variant="secondary"
          onClick={() => router.replace(destinationFor(user?.role ?? "customer", null))}
        >
          بازگشت
        </Button>
        <Button variant="ghost" onClick={() => void logout()}>
          خروج
        </Button>
      </div>
    </Panel>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (status === "unauthenticated")
      router.replace(
        `/login?next=${encodeURIComponent(`${pathname}${search.toString() ? `?${search}` : ""}`)}`,
      );
  }, [pathname, router, search, status]);
  if (status === "initializing") return <AuthLoading />;
  if (status === "error") return <AuthError />;
  if (status !== "authenticated") return null;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: AuthRole; children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  if (status === "initializing") return <AuthLoading />;
  if (status === "error") return <AuthError />;
  if (status !== "authenticated" || !user) return <RequireAuth>{children}</RequireAuth>;
  if (user.role !== role) return <Forbidden role={role} />;
  return <>{children}</>;
}

export function RequireTorobcheAccess({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "initializing") return <AuthLoading />;
  if (status === "error") return <AuthError />;
  if (status !== "authenticated" || !user) return <RequireAuth>{children}</RequireAuth>;
  if (user.role === "staff") return <Forbidden role="staff" />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(destinationFor(user.role, null));
  }, [router, status, user]);
  if (status === "initializing") return <AuthLoading />;
  if (status === "authenticated") return null;
  return <>{children}</>;
}
