"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, FieldError, FieldLabel, Input } from "@/components/ui";
import { getFieldErrors, getPersianErrorMessage } from "@/lib/api";
import { useAuth } from "../context/auth-context";
import { loginSchema, type LoginFormValues } from "../schemas";
import { destinationFor } from "../utils/redirect";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const registered = search.get("registered") === "1";
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values);
      form.reset({ username: "", password: "" });
      router.replace(destinationFor(user.role, next));
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (field === "username" || field === "password")
          form.setError(field, { type: "server", message: messages[0] ?? "ورود ناموفق بود." });
      }
      if (!Object.keys(fieldErrors).length)
        form.setError("root", { type: "server", message: getPersianErrorMessage(error) });
    }
  });
  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      {registered && <Alert tone="success">ثبت‌نام انجام شد. اکنون وارد شوید.</Alert>}
      {form.formState.errors.root?.message && (
        <Alert tone="danger" title="ورود ناموفق">
          {form.formState.errors.root.message}
        </Alert>
      )}
      <Field>
        <FieldLabel htmlFor="username">نام کاربری</FieldLabel>
        <Input
          id="username"
          dir="ltr"
          autoComplete="username"
          aria-invalid={!!form.formState.errors.username}
          aria-describedby="username-error"
          {...form.register("username")}
        />
        <FieldError id="username-error">{form.formState.errors.username?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
        <Input
          id="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          aria-invalid={!!form.formState.errors.password}
          aria-describedby="password-error"
          {...form.register("password")}
        />
        <FieldError id="password-error">{form.formState.errors.password?.message}</FieldError>
      </Field>
      <Button type="submit" loading={form.formState.isSubmitting}>
        ورود
      </Button>
      <p className="m-0 text-center text-sm text-[var(--text-secondary)]">
        حساب ندارید؟{" "}
        <Link
          className="text-[var(--accent-radish)] underline-offset-4 hover:underline"
          href="/register"
        >
          ثبت‌نام مشتری
        </Link>
      </p>
    </form>
  );
}
