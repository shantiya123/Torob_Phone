import { Container } from "@/components/ui";
import { HomeLink } from "./home-link";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="pb-16 sm:pb-24">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-stage)] border border-[var(--border-strong)] bg-[var(--surface-primary)] px-6 py-10 shadow-[var(--shadow-level-2)] sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-1.5 bg-[var(--accent-radish)]"
          />

          <div className="relative max-w-2xl">
            <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">
              شروع مسیر بعدی
            </p>
            <h2
              id="final-cta-title"
              className="mt-3 text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl"
            >
              اول نیازت را روشن کن، بعد پیشنهادها را بسنج.
            </h2>
            <p className="mb-0 mt-4 max-w-xl leading-7 text-[var(--text-secondary)]">
              با تربچه انتخابت را دقیق‌تر کن، فروشگاه‌ها را مقایسه کن یا فروشگاه خودت را برای حضور در ترب‌فون ثبت کن.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-3 lg:mt-0 lg:min-w-[34rem]">
            <HomeLink href="/torobche" variant="primary" className="w-full">
              شروع با تربچه
            </HomeLink>

            <HomeLink href="/stores" variant="secondary" className="w-full">
              مشاهده فروشگاه‌ها
            </HomeLink>

            <HomeLink
              href="/register/store"
              variant="secondary"
              className="w-full border-[var(--accent-radish)] text-[var(--accent-radish)] hover:bg-[var(--accent-radish-soft)] hover:text-[var(--text-primary)]"
            >
              ثبت فروشگاه
            </HomeLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
