import { Container } from "@/components/ui";

const steps = [
  {
    number: "۰۱",
    title: "نیازت را روشن کن",
    description: "با Torobche گفتگو کن یا مستقیماً وارد بازار فروشگاه‌ها شو.",
  },
  {
    number: "۰۲",
    title: "مدل دقیق را ببین",
    description: "مدل، حافظه و رم به‌صورت مشخص و بدون ترکیب اشتباه نمایش داده می‌شوند.",
  },
  {
    number: "۰۳",
    title: "پیشنهادها را مقایسه کن",
    description: "قیمت و موجودی هر پیشنهاد از قرارداد واقعی فروشگاه می‌آید.",
  },
];

export function MarketplaceProcess() {
  return (
    <section
      aria-labelledby="process-title"
      className="border-y border-[var(--border-subtle)] py-16 sm:py-24"
    >
      <Container>
        <div className="max-w-2xl">
          <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">مسیر انتخاب</p>
          <h2 id="process-title" className="mt-3 text-3xl font-bold sm:text-4xl">
            از یک نیاز مبهم تا یک انتخاب قابل بررسی
          </h2>
        </div>
        <ol className="mt-10 grid list-none gap-4 p-0 lg:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="group relative min-h-52 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 transition-[border-color,transform] duration-[var(--duration-standard)] hover:-translate-y-1 hover:border-[var(--border-strong)] motion-reduce:transform-none"
            >
              <span dir="ltr" className="text-sm font-bold text-[var(--accent-radish)]">
                {step.number}
              </span>
              <h3 className="mt-10 text-xl font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {step.description}
              </p>
              <div className="absolute inset-inline-end-0 inset-block-end-0 size-24 translate-x-1/3 translate-y-1/3 rounded-full border border-[var(--accent-radish-soft)] opacity-60 transition-transform duration-[var(--duration-layout)] group-hover:scale-125 motion-reduce:transform-none" />
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
