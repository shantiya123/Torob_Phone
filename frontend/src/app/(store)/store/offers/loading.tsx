import { Container, Skeleton } from "@/components/ui";

export default function StoreOffersLoading() {
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="grid gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-11 w-64" /><Skeleton className="h-6 w-96 max-w-full" /></div>
          <Skeleton className="h-11 w-40" />
        </div>
        <Skeleton className="mt-8 h-28" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-72" />)}</div>
      </Container>
    </main>
  );
}
