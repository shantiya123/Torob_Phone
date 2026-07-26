"use client";

export default function Error({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-6 py-16"
    >
      <p className="text-sm font-medium text-[var(--color-danger)]">خطایی رخ داد</p>
      <h1 className="text-3xl font-semibold">این بخش موقتاً در دسترس نیست.</h1>
      <p className="text-[var(--color-text-secondary)]">می‌توانی دوباره تلاش کنی.</p>
      <button
        type="button"
        onClick={reset}
        className="w-fit rounded-md bg-[var(--color-radish)] px-5 py-3 font-medium text-white transition-colors hover:bg-[var(--color-radish-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-radish)]"
      >
        تلاش دوباره
      </button>
    </main>
  );
}
