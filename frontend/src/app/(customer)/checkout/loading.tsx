import { Container, Skeleton } from "@/components/ui";

export default function CheckoutLoading() {
  return (
    <Container className="py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4"><Skeleton className="h-28" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
        <Skeleton className="h-96" />
      </div>
    </Container>
  );
}
