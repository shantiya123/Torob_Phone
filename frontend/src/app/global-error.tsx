"use client";

export default function GlobalError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main
          id="main-content"
          className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16"
        >
          <p className="text-sm font-medium text-[var(--color-danger)]">خطای سامانه</p>
          <h1 className="text-3xl font-semibold">امکان بارگذاری برنامه وجود ندارد.</h1>
          <button
            type="button"
            onClick={reset}
            className="w-fit rounded-md bg-[var(--color-radish)] px-5 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-radish)]"
          >
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
