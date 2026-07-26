import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { GuestOnly } from "@/features/auth/components/guards";

export default function RegisterPage() {
  return (
    <GuestOnly>
      <AuthShell title="ساخت حساب مشتری" description="برای خرید و مدیریت سفارش‌ها حساب بسازید.">
        <RegisterForm />
      </AuthShell>
    </GuestOnly>
  );
}
