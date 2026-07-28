import { Container, Skeleton } from "@/components/ui";

export default function AccountLoading() {
  return (
    <main id="main-content">
      <Container className="grid gap-6 py-8 md:py-12">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="grid gap-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </Container>
    </main>
  );
}
