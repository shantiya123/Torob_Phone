import { Container, Skeleton } from "@/components/ui";
export default function Loading() {
  return <main id="main-content"><Container className="py-10 sm:py-14"><Skeleton className="h-10 w-64"/><div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-4"><Skeleton className="h-48"/><Skeleton className="h-48"/></div><Skeleton className="h-80"/></div></Container></main>;
}
