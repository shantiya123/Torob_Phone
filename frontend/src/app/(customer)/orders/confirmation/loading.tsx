import { Container, Skeleton } from "@/components/ui";

export default function OrderConfirmationLoading() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="grid gap-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-44" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </Container>
  );
}
