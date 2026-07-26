export function FoundationPlaceholder() {
  return (
    <section
      aria-labelledby="foundation-title"
      className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col justify-center gap-4 px-6 py-16 sm:px-10"
    >
      <p className="text-sm font-medium tracking-wide text-[var(--color-radish)]">
        زیرساخت آماده است
      </p>
      <h1 id="foundation-title" className="max-w-3xl text-3xl font-semibold sm:text-5xl">
        Torob Phone
      </h1>
      <p className="max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
        پایهٔ Next.js، راست‌به‌چپ و ابزارهای کیفیت آماده شده است. صفحات محصول در گروه‌های بعدی
        پیاده‌سازی می‌شوند.
      </p>
    </section>
  );
}
