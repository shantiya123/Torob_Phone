"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Panel,
  PriceDisplay,
  Stack,
  Alert,
  Badge,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui";

export function UiGallery() {
  const [loading, setLoading] = useState(false);
  return (
    <main id="main-content">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10">
        <header>
          <p className="m-0 text-sm text-[var(--accent-radish)]">FE002 / توسعه</p>
          <h1 className="mt-2 text-3xl font-bold">کتابخانه رابط کاربری</h1>
        </header>
        <Panel>
          <Stack>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setLoading(true);
                  window.setTimeout(() => setLoading(false), 500);
                }}
                loading={loading}
              >
                عمل اصلی
              </Button>
              <Button variant="secondary">ثانویه</Button>
              <Button variant="ghost">کم‌رنگ</Button>
              <Badge tone="success">تأیید شده</Badge>
            </div>
            <Alert title="وضعیت سیستم">این صفحه فقط برای بازبینی توسعه است.</Alert>
          </Stack>
        </Panel>
        <Card>
          <CardHeader>
            <CardTitle>فرم نمونه</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="sample">نام مدل</FieldLabel>
              <Input
                id="sample"
                placeholder="برای نمونه Galaxy S25"
                aria-describedby="sample-help"
              />
              <FieldDescription>نام‌های لاتین در رابط فارسی جدا و خوانا می‌مانند.</FieldDescription>
              <FieldError id="sample-error">نمونه خطای قابل دسترس</FieldError>
            </Field>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <PriceDisplay value={12990000} />
          <Skeleton className="h-20" />
          <EmptyState title="موردی وجود ندارد" description="نتیجه‌ای برای نمایش پیدا نشد." />
        </div>
        <ErrorState description="این یک وضعیت خطای قابل بازبینی است." onRetry={() => undefined} />
      </div>
    </main>
  );
}
