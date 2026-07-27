import { Container, Skeleton } from "@/components/ui";

export default function TorobcheLoading() {
  return (
    <main id="main-content">
      <Container className="grid max-w-4xl gap-6 py-12" aria-label="در حال آماده‌سازی تربچه">
        <Skeleton className="mx-auto h-12 w-3/4" />
        <Skeleton className="h-80 w-full rounded-[var(--radius-stage)]" />
        <Skeleton className="h-40 w-full" />
      </Container>
    </main>
  );
}
