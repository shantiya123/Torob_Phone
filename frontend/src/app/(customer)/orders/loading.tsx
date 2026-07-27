import { Container, Skeleton } from "@/components/ui";

export default function OrdersLoading() {
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-4 h-11 w-64 max-w-full" />
        <Skeleton className="mt-4 h-6 w-full max-w-xl" />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-64 w-full rounded-[var(--radius-card)]" />
          ))}
        </div>
      </Container>
    </main>
  );
}
