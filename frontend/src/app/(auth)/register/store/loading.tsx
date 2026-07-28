import { Container, Panel, Skeleton } from "@/components/ui";

export default function StoreRegistrationLoading() {
  return (
    <main id="main-content">
      <Container className="grid gap-6 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full max-w-2xl" />
        {[1, 2, 3].map((item) => (
          <Panel key={item} className="grid gap-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </Panel>
        ))}
      </Container>
    </main>
  );
}
