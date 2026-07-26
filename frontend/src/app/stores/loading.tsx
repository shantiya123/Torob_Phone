import { Container, Skeleton } from "@/components/ui";

export default function StoresLoading() {
  return (
    <main id="main-content" aria-busy="true">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        <Skeleton className="mt-4 h-7 w-full max-w-xl" />
        <Skeleton className="mt-8 h-24 w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      </Container>
    </main>
  );
}
