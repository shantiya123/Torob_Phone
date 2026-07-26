import { Container, Skeleton } from "@/components/ui";

export default function StorefrontLoading() {
  return (
    <main id="main-content" aria-busy="true">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-4 w-48" />
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="w-full">
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="mt-3 h-5 w-44" />
            <Skeleton className="mt-5 h-6 w-full max-w-2xl" />
          </div>
        </div>
        <Skeleton className="mt-12 h-9 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))}
        </div>
      </Container>
    </main>
  );
}
