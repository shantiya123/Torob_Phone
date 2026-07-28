import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, DateDisplay } from "@/components/ui";
import { PersonalizedExplanationSection } from "@/features/phones/components/personalized-explanation-section";
import { VariantOffersSection } from "@/features/phones/components/variant-offers-section";
import { SpecificationOverview } from "@/features/phones/components/specification-overview";
import { VariantImage } from "@/features/phones/components/variant-image";
import {
  isNotFoundError,
  parseVariantId,
  parseVariantOrdering,
  parseVariantPage,
} from "@/features/phones/utils";
import { catalogApi } from "@/lib/api/catalog";
import type { DeviceVariantDetail } from "@/types/api";

type Params = Promise<{ variantId: string }>;
type SearchParams = Promise<{ page?: string; ordering?: string }>;

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const id = parseVariantId((await params).variantId);
  if (!id) return { title: "گوشی | ترب‌فون" };
  try {
    const variant = await catalogApi.variant(id);
    const configuration = [
      variant.storage_gb ? `${variant.storage_gb}GB` : null,
      variant.ram_gb ? `${variant.ram_gb}GB RAM` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    return {
      title: `${variant.brand} ${variant.model_name}${configuration ? `، ${configuration}` : ""}`,
      description: `مشخصات و پیشنهادهای فعلی ${variant.brand} ${variant.model_name} در ترب‌فون.`,
    };
  } catch {
    return { title: "گوشی | ترب‌فون" };
  }
}

export default async function VariantPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const id = parseVariantId((await params).variantId);
  if (!id) notFound();
  const query = await searchParams;
  const page = parseVariantPage(query.page);
  const ordering = parseVariantOrdering(query.ordering);

  let variant: DeviceVariantDetail;
  try {
    variant = await catalogApi.variant(id);
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    throw error;
  }
  const title = `${variant.brand} ${variant.model_name}`;

  return (
    <main id="main-content">
      <Container className="py-8 sm:py-12">
        <nav aria-label="مسیر صفحه" className="mb-8 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-primary)] hover:underline">
            خانه
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link href="/stores" className="hover:text-[var(--text-primary)] hover:underline">
            فروشگاه‌ها
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span aria-current="page">{title}</span>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="grid aspect-square max-w-xl place-items-center rounded-[var(--radius-stage)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-8">
            <VariantImage variant={variant} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--accent-radish)]">پیکربندی دقیق</p>
            <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-5xl">
              <span dir="ltr" className="inline-block">
                {title}
              </span>
            </h1>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {variant.ram_gb !== null && (
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-2">
                  <bdi dir="ltr">{variant.ram_gb}GB</bdi> رم
                </span>
              )}
              {variant.storage_gb !== null && (
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-2">
                  <bdi dir="ltr">{variant.storage_gb}GB</bdi> حافظه
                </span>
              )}
              {variant.storage_technology && (
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-2" dir="ltr">
                  {variant.storage_technology}
                </span>
              )}
              {variant.sku_or_region && (
                <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-2" dir="ltr">
                  {variant.sku_or_region}
                </span>
              )}
            </div>
            <dl className="mt-6 grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">نوع دستگاه</dt>
                <dd className="mt-1 m-0">{variant.device_kind}</dd>
              </div>
              {variant.announced_on && (
                <div>
                  <dt className="text-[var(--text-muted)]">معرفی</dt>
                  <dd className="mt-1 m-0">
                    <DateDisplay value={variant.announced_on} />
                  </dd>
                </div>
              )}
              {variant.released_on && (
                <div>
                  <dt className="text-[var(--text-muted)]">عرضه</dt>
                  <dd className="mt-1 m-0">
                    <DateDisplay value={variant.released_on} />
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <PersonalizedExplanationSection variantId={id} />

        <VariantOffersSection variantId={id} page={page} ordering={ordering} />

        <SpecificationOverview variant={variant} />
      </Container>
    </main>
  );
}
