import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main id="main-content" aria-busy="true" aria-label="در حال آماده‌سازی صفحه اصلی">
      <Container className="grid min-h-[72vh] items-center gap-12 py-12 lg:grid-cols-2">
        <div className="grid gap-5">
          <Skeleton className="h-5 w-36 motion-reduce:animate-none" />
          <Skeleton className="h-16 w-full max-w-xl motion-reduce:animate-none" />
          <Skeleton className="h-7 w-full max-w-lg motion-reduce:animate-none" />
          <div className="flex gap-3">
            <Skeleton className="h-[52px] w-44 motion-reduce:animate-none" />
            <Skeleton className="h-[52px] w-36 motion-reduce:animate-none" />
          </div>
        </div>
        <Skeleton className="min-h-[360px] rounded-[var(--radius-stage)] motion-reduce:animate-none" />
      </Container>
    </main>
  );
}
