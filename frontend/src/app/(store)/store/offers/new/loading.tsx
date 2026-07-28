import { Container, Skeleton } from "@/components/ui";

export default function CreateStoreOfferLoading() {
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-6 w-full max-w-xl" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      </Container>
    </main>
  );
}
