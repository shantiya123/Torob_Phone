"use client";

import { ErrorState } from "@/components/ui";

export function StoreRouteError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content">
      <div className="mx-auto grid min-h-[55vh] w-full max-w-3xl place-items-center px-4 py-16">
        <ErrorState
          title="فروشگاه‌ها فعلاً در دسترس نیستند"
          description="ارتباط با اطلاعات عمومی فروشگاه برقرار نشد."
          onRetry={reset}
        />
      </div>
    </main>
  );
}
