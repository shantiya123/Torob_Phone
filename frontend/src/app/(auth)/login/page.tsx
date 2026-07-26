import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { GuestOnly } from "@/features/auth/components/guards";

export default function LoginPage() {
  return (
    <GuestOnly>
      <AuthShell title="ورود به Torob Phone" description="برای ادامه وارد حساب کاربری خود شوید.">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthShell>
    </GuestOnly>
  );
}
