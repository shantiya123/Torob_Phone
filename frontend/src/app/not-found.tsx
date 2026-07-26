import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-6 py-16"
    >
      <p className="text-sm font-medium text-[var(--color-radish)]">۴۰۴</p>
      <h1 className="text-3xl font-semibold">صفحه پیدا نشد.</h1>
      <p className="text-[var(--color-text-secondary)]">آدرس را بررسی کن یا به صفحهٔ اصلی برگرد.</p>
      <Link
        href="/"
        className="w-fit rounded-md bg-[var(--color-radish)] px-5 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-radish)]"
      >
        بازگشت به صفحهٔ اصلی
      </Link>
    </main>
  );
}
