import { Container, Skeleton } from "@/components/ui";

export default function BasketLoading() {
  return (
    <Container className="py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        <Skeleton className="h-72" />
      </div>
    </Container>
  );
}
