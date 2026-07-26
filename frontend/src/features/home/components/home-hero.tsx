import { Container } from "@/components/ui";
import { HeroVisual } from "./hero-visual";
import { HomeLink } from "./home-link";

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-title"
      className="relative overflow-hidden py-10 sm:py-16 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgb(232_62_79_/_10%),transparent_35%)]" />
      <Container className="relative grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-[var(--accent-radish)]">
            بازار گوشی، روشن و قابل مقایسه
          </p>
          <h1
            id="home-title"
            className="m-0 text-[clamp(2.25rem,5vw,4.75rem)] font-bold leading-[1.16] tracking-[-0.035em]"
          >
            نیازت را بگو؛
            <span className="block text-[var(--accent-radish)]">انتخاب دقیق را ببین.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            Torobche درخواستت را به مدل‌های دقیق گوشی وصل می‌کند؛ بعد می‌توانی پیشنهاد فروشگاه‌ها را
            شفاف و بدون ادعای ساختگی بررسی کنی.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <HomeLink href="/torobche">
              شروع گفتگو با Torobche
              <span aria-hidden="true">←</span>
            </HomeLink>
            <HomeLink href="/stores" variant="secondary">
              مشاهده فروشگاه‌ها
            </HomeLink>
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
            قیمت، موجودی و مشخصات فقط از داده‌های واقعی بازار نمایش داده می‌شوند.
          </p>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
