import { Container } from "@/components/ui";
import { HomeLink } from "./home-link";
import { TorobchePresence } from "./torobche-presence";

const examples = ["گوشی سبک با باتری خوب", "دوربین بهتر برای سفر", "عملکرد روان برای بازی"];

export function TorobcheSection() {
  return (
    <section aria-labelledby="torobche-title" className="py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-10 rounded-[var(--radius-stage)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5 sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:p-12">
          <TorobchePresence />
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--accent-radish)]">
              یک جست‌وجوی زنده
            </p>
            <h2 id="torobche-title" className="mt-3 text-3xl font-bold sm:text-4xl">
              از Torobche همان‌طور بپرس که فکر می‌کنی
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)]">
              لازم نیست مشخصات فنی را از قبل بدانی. نیازت را طبیعی توضیح بده و نتیجه را روی مدل‌های
              دقیق بررسی کن.
            </p>
            <ul aria-label="نمونه درخواست‌ها" className="mt-6 flex list-none flex-wrap gap-2 p-0">
              {examples.map((example) => (
                <li
                  key={example}
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                >
                  {example}
                </li>
              ))}
            </ul>
            <HomeLink href="/torobche" className="mt-7">
              شروع گفتگو با Torobche
              <span aria-hidden="true">←</span>
            </HomeLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
