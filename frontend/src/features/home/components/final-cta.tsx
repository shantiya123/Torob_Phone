import { Container } from "@/components/ui";
import { HomeLink } from "./home-link";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="pb-16 sm:pb-24">
      <Container>
        <div className="overflow-hidden rounded-[var(--radius-stage)] bg-[var(--accent-radish)] px-6 py-12 text-[var(--text-inverse)] sm:px-10 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="m-0 text-sm font-semibold opacity-80">شروع مسیر بعدی</p>
            <h2 id="final-cta-title" className="mt-3 text-3xl font-bold sm:text-4xl">
              اول نیازت را روشن کن، بعد پیشنهادها را بسنج.
            </h2>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <HomeLink
              href="/torobche"
              variant="secondary"
              className="border-[var(--text-inverse)] bg-[var(--text-inverse)] text-[var(--text-primary)] hover:bg-[var(--surface-primary)]"
            >
              شروع با Torobche
            </HomeLink>
            <HomeLink
              href="/stores"
              variant="quiet"
              className="text-[var(--text-inverse)] hover:bg-[color:rgb(17_19_24_/_12%)]"
            >
              مشاهده فروشگاه‌ها
            </HomeLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
