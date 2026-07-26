import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfferComparison } from "@/features/phones/components/offer-comparison";
import { parseVariantId, parseVariantOrdering } from "@/features/phones/utils";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context";
import { ApiClient } from "@/lib/api";
import { catalogApi } from "@/lib/api/catalog";
import { deviceVariantDetailSchema, publicOfferSchema } from "@/lib/api/schemas";
import type { PublicOffer } from "@/types/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://localhost:8000/api";
const offer = (id: number, price: number, quantity = 4): PublicOffer => ({
  id,
  device_variant: {
    id: 31,
    brand: "Samsung",
    model_name: "Galaxy S",
    device_kind: "phone",
    image_url: null,
    storage_gb: 256,
    ram_gb: 12,
    storage_technology: "UFS",
    is_available: true,
  },
  store: { id: id + 100, name: `فروشگاه ${id}`, slug: `store-${id}`, logo: null },
  price,
  quantity,
  available: true,
  description: null,
  created_at: "2026-07-26T12:00:00Z",
  updated_at: "2026-07-26T12:00:00Z",
});

const auth: AuthContextValue = {
  status: "unauthenticated",
  user: null,
  error: null,
  login: async () => {
    throw new Error("not used");
  },
  registerCustomer: async () => undefined,
  logout: async () => undefined,
  refreshSession: async () => null,
  hasRole: () => false,
};

describe("FE008 Variant detail", () => {
  it("normalizes numeric IDs and unsupported ordering safely", () => {
    expect(parseVariantId("31")).toBe(31);
    expect(parseVariantId("31x")).toBeNull();
    expect(parseVariantOrdering("invalid")).toBe("price");
    expect(parseVariantOrdering("price_desc")).toBe("price_desc");
  });

  it("uses the supplied ApiClient and sends the bounded public request", async () => {
    let requestUrl = "";
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/offers/`, ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
    );
    const client = new ApiClient({ baseUrl });
    await catalogApi.variantOffers(31, { page: 2, pageSize: 20, ordering: "price_desc" }, client);
    expect(requestUrl).toContain("page=2");
    expect(requestUrl).toContain("page_size=20");
    expect(requestUrl).toContain("ordering=price_desc");
  });

  it("rejects private fields and malformed Variant data", () => {
    expect(publicOfferSchema.safeParse({ ...offer(1, 100), address: "private" }).success).toBe(
      false,
    );
    expect(
      deviceVariantDetailSchema.safeParse({ id: 31, brand: "Samsung", owner: "private" }).success,
    ).toBe(false);
  });

  it("renders multiple Offers with truthful lowest-price emphasis and Store links", () => {
    render(
      <AuthContext.Provider value={auth}>
        <OfferComparison offers={[offer(1, 100), offer(2, 200)]} variantId={31} />
      </AuthContext.Provider>,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText("کمترین قیمت فعلی")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "مشاهدهٔ فروشگاه" })[0]).toHaveAttribute(
      "href",
      "/stores/101",
    );
    expect(screen.queryByText(/business_phone|address|legal_profile/i)).toBeNull();
  });

  it("exposes an integer quantity bounded by the selected Offer", () => {
    render(
      <AuthContext.Provider value={auth}>
        <OfferComparison offers={[offer(1, 100, 3)]} variantId={31} />
      </AuthContext.Provider>,
    );
    const quantity = screen.getByLabelText("تعداد");
    expect(quantity).toHaveAttribute("min", "1");
    expect(quantity).toHaveAttribute("max", "3");
    expect(quantity).toHaveAttribute("step", "1");
  });
});
