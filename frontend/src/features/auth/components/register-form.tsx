"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { getFieldErrors, getPersianErrorMessage } from "@/lib/api";
import { useAuth } from "../context/auth-context";
import { customerRegistrationSchema, type CustomerRegistrationFormValues } from "../schemas";

export function RegisterForm() {
  const { registerCustomer } = useAuth();
  const router = useRouter();
  const form = useForm<CustomerRegistrationFormValues>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: { username: "", email: "", password: "", password_confirm: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
      console.log("API base:", process.env.NEXT_PUBLIC_API_BASE_URL);
    try {
      await registerCustomer(values);
      form.reset();
      router.replace("/login?registered=1");
    } catch (error) {
        console.error("FULL ERROR:", error);
      const fieldErrors = getFieldErrors(error);
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (field === "username" || field === "email" || field === "password")
          form.setError(field, {
            type: "server",
            message: messages[0] ?? "اطلاعات ثبت‌نام معتبر نیست.",
          });
      }
      if (!Object.keys(fieldErrors).length)
        form.setError("root", { type: "server", message: getPersianErrorMessage(error) });
    }
  });
  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      {form.formState.errors.root?.message && (
        <Alert tone="danger" title="ثبت‌نام ناموفق">
          {form.formState.errors.root.message}
        </Alert>
      )}
      <Field>
        <FieldLabel htmlFor="register-username">نام کاربری</FieldLabel>
        <Input
          id="register-username"
          dir="ltr"
          autoComplete="username"
          aria-describedby="register-username-error"
          {...form.register("username")}
        />
        <FieldError id="register-username-error">
          {form.formState.errors.username?.message}
        </FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="register-email">ایمیل</FieldLabel>
        <Input
          id="register-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          aria-describedby="register-email-error"
          {...form.register("email")}
        />
        <FieldError id="register-email-error">{form.formState.errors.email?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="register-password">رمز عبور</FieldLabel>
        <Input
          id="register-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          aria-describedby="register-password-error"
          {...form.register("password")}
        />
        <FieldError id="register-password-error">
          {form.formState.errors.password?.message}
        </FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="register-password-confirm">تکرار رمز عبور</FieldLabel>
        <Input
          id="register-password-confirm"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          aria-describedby="register-password-confirm-error"
          {...form.register("password_confirm")}
        />
        <FieldError id="register-password-confirm-error">
          {form.formState.errors.password_confirm?.message}
        </FieldError>
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting}>
        ساخت حساب
      </Button>
      <p className="m-0 text-center text-sm text-[var(--text-secondary)]">
        حساب دارید؟{" "}
        <Link
          className="text-[var(--accent-radish)] underline-offset-4 hover:underline"
          href="/login"
        >
          ورود
        </Link>
      </p>
    </form>
  );
}
