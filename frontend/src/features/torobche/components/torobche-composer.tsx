"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui";

const composerSchema = z.object({
  message: z
    .string()
    .trim()
    .min(3, "کمی بیشتر دربارهٔ گوشی موردنظرت بنویس.")
    .max(1000, "درخواست باید کوتاه‌تر از ۱۰۰۰ نویسه باشد."),
});

type ComposerValues = z.infer<typeof composerSchema>;

export function TorobcheComposer({
  pending,
  defaultMessage = "",
  compact = false,
  onFocusChange,
  onSubmit,
  focusSignal = 0,
}: {
  pending: boolean;
  defaultMessage?: string;
  compact?: boolean;
  onFocusChange(focused: boolean): void;
  onSubmit(message: string): Promise<void>;
  focusSignal?: number;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: { message: defaultMessage },
  });
  const registration = register("message");

  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  const suggestions = [
    "یک گوشی تا ۳۰ میلیون با باتری قوی می‌خواهم",
    "گوشی سبک با دوربین خوب و حافظهٔ ۲۵۶ گیگ",
    "مدلی با نمایشگر ۱۲۰ هرتز و پشتیبانی 5G",
  ];

  return (
    <form
      aria-label="جست‌وجوی تربچه"
      className="grid gap-3"
      onSubmit={handleSubmit(async ({ message }) => onSubmit(message.trim()))}
    >
      <label htmlFor="torobche-message" className="text-sm font-semibold">
        چه گوشی‌ای برایت مناسب است؟
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <textarea
          {...registration}
          ref={(element) => {
            registration.ref(element);
            inputRef.current = element;
          }}
          id="torobche-message"
          rows={compact ? 2 : 3}
          disabled={pending}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "torobche-message-error" : "torobche-message-help"}
          placeholder="مثلاً بودجه، دوربین، باتری یا اندازهٔ نمایشگر را بگو…"
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          className="min-h-14 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-3 leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-60"
        />
        <Button type="submit" size="lg" loading={pending} className="sm:min-w-32">
          پیدا کن
        </Button>
      </div>
      {errors.message ? (
        <p
          id="torobche-message-error"
          role="alert"
          className="m-0 text-sm text-[var(--status-danger)]"
        >
          {errors.message.message}
        </p>
      ) : (
        <p id="torobche-message-help" className="m-0 text-sm text-[var(--text-muted)]">
          هرچه نیازت روشن‌تر باشد، معیارهای دقیق‌تری برای جست‌وجو ثبت می‌شود.
        </p>
      )}
      {!compact && (
        <div aria-label="نمونه درخواست‌ها" className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setValue("message", suggestion, { shouldValidate: true });
                inputRef.current?.focus();
              }}
              className="min-h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
