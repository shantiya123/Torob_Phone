export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="در حال بارگذاری"
      className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col justify-center gap-4 px-6 py-16 sm:px-10"
    >
      <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-slate)] motion-reduce:animate-none" />
      <div className="h-12 max-w-md animate-pulse rounded bg-[var(--color-slate)] motion-reduce:animate-none" />
      <div className="h-5 max-w-xl animate-pulse rounded bg-[var(--color-slate)] motion-reduce:animate-none" />
    </main>
  );
}
