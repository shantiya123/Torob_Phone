import { Container, Skeleton } from "@/components/ui";

export default function VariantLoading() {
  return (
    <main id="main-content" aria-busy="true">
      <Container className="py-8 sm:py-12">
        <Skeleton className="h-4 w-56" />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full max-w-xl" />
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-14 w-80 max-w-full" />
            <Skeleton className="mt-6 h-12 w-full" />
            <Skeleton className="mt-6 h-24 w-full" />
          </div>
        </div>
        <Skeleton className="mt-12 h-9 w-48" />
        <Skeleton className="mt-6 h-56 w-full" />
        <Skeleton className="mt-12 h-9 w-64" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      </Container>
    </main>
  );
}
