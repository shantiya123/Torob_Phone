import { Container, Skeleton } from "@/components/ui";

export default function WalletLoading() {
  return (
    <main id="main-content">
      <Container className="py-10 sm:py-14">
        <Skeleton className="h-10 w-52" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-40" />)}</div>
          <Skeleton className="h-72" />
        </div>
      </Container>
    </main>
  );
}
