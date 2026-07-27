import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { OfferCard } from "@/features/stores/components/offer-card";
import { StoreCard } from "@/features/stores/components/store-card";
import { StoreIdentity } from "@/features/stores/components/store-identity";
import { StoreOfferPreview } from "@/features/stores/components/store-offer-preview";
import { ApiClient } from "@/lib/api";
import { publicOfferSchema, publicStoreDetailSchema, publicStoreSchema } from "@/lib/api/schemas";
import { storesApi } from "@/lib/api/stores";
import { apiMockServer } from "./setup";

const baseUrl = "http://localhost:8000/api";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const store = { id: 9, name: "فروشگاه سپهر", slug: "sepehr", logo: null };
const offer = {
  id: 21,
  device_variant: {
    id: 42,
    brand: "Pixel",
    model_name: "9 Pro",
    device_kind: "phone",
    image_url: null,
    storage_gb: 256,
    ram_gb: 12,
    storage_technology: "UFS",
    is_available: true,
  },
  store,
  price: 123456789,
  quantity: 3,
  available: true,
  description: null,
  created_at: "2026-07-26T12:00:00Z",
  updated_at: "2026-07-26T12:00:00Z",
};

describe("FE007 public Stores", () => {
  it("uses numeric Store and DeviceVariant destinations", () => {
    render(<StoreCard store={store} />);
    expect(screen.getByRole("link", { name: /فروشگاه سپهر/ })).toHaveAttribute("href", "/stores/9");
    render(<OfferCard offer={offer} />);
    expect(screen.getByRole("link", { name: /مشاهده Pixel 9 Pro/ })).toHaveAttribute(
      "href",
      "/phones/42",
    );
  });

  it("keeps public schemas strict and rejects private fields", () => {
    expect(publicStoreSchema.safeParse({ ...store, business_phone: "private" }).success).toBe(
      false,
    );
    expect(publicOfferSchema.safeParse({ ...offer, address: "private" }).success).toBe(false);
  });

  it("passes search, pagination, and supported ordering through the typed API", async () => {
    const seen: string[] = [];
    apiMockServer.use(
      http.get(`${baseUrl}/stores/`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
      http.get(`${baseUrl}/stores/9/`, () =>
        HttpResponse.json({ ...store, description: "توضیح", created_at: "2026-07-26T12:00:00Z" }),
      ),
      http.get(`${baseUrl}/stores/9/offers/`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
    );
    await storesApi.list({ page: 2, pageSize: 12, search: "se" }, new ApiClient({ baseUrl }));
    await storesApi.offers(
      9,
      { page: 3, pageSize: 12, ordering: "price_asc" },
      new ApiClient({ baseUrl }),
    );
    expect(seen[0]).toContain("page=2");
    expect(seen[0]).toContain("search=se");
    expect(seen[1]).toContain("ordering=price_asc");
    expect(seen[1]).toContain("page=3");
  });

  it("accepts a nullable public description and keeps Store identity usable", () => {
    const detail = { ...store, description: null, created_at: "2026-07-26T12:00:00Z" };
    expect(publicStoreDetailSchema.safeParse(detail).success).toBe(true);
    render(<StoreIdentity store={detail} />);
    expect(screen.getByRole("heading", { name: store.name })).toBeInTheDocument();
    expect(screen.getByText("این فروشگاه هنوز توضیح عمومی اضافه نکرده است.")).toBeInTheDocument();
  });

  it("renders at most five Offers and uses the approved destinations", () => {
    const offers = Array.from({ length: 7 }, (_, index) => ({
      ...offer,
      id: offer.id + index,
      device_variant: { ...offer.device_variant, id: offer.device_variant.id + index },
    }));
    render(<StoreOfferPreview store={store} offers={offers} />);
    expect(screen.getAllByRole("link", { name: /مشاهده Pixel 9 Pro/ })).toHaveLength(5);
    expect(
      screen.getByRole("link", { name: `مشاهده همه پیشنهادهای فروشگاه ${store.name}` }),
    ).toHaveAttribute("href", "/stores/9/offers");
    expect(screen.getByRole("link", { name: /مشاهده Pixel 9 Pro/ })).toHaveAttribute(
      "href",
      "/phones/42",
    );
  });

  it("shows an Offer empty state without hiding Store context", () => {
    render(<StoreOfferPreview store={store} offers={[]} />);
    expect(screen.getByText("پیشنهاد فعالی وجود ندارد")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(store.name) })).toBeInTheDocument();
  });

  it("keeps partial Offer failure section-scoped and retries by refetching", () => {
    refresh.mockClear();
    render(<StoreOfferPreview store={store} offers={[]} failed />);
    expect(screen.getByText("پیشنهادها بارگذاری نشدند")).toBeInTheDocument();
    screen.getByRole("button", { name: /تلاش دوباره/ }).click();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not expose private Store fields in public detail validation", () => {
    expect(
      publicStoreDetailSchema.safeParse({
        ...store,
        description: null,
        created_at: "2026-07-26T12:00:00Z",
        business_phone: "private",
      }).success,
    ).toBe(false);
  });
});
