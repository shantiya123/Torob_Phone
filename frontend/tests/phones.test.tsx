import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfferComparison } from "@/features/phones/components/offer-comparison";
import { PersonalizedExplanationSection } from "@/features/phones/components/personalized-explanation-section";
import { VariantOffersSection } from "@/features/phones/components/variant-offers-section";
import { parseVariantId, parseVariantOrdering } from "@/features/phones/utils";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context";
import { ApiClient } from "@/lib/api";
import { catalogApi } from "@/lib/api/catalog";
import { deviceVariantDetailSchema, publicOfferDetailSchema, publicOfferSchema } from "@/lib/api/schemas";
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


  it("accepts the real public Offer-list shape without detail timestamps", () => {
    const listOffer = { ...offer(1, 100) };
    delete listOffer.created_at;
    delete listOffer.updated_at;
    expect(publicOfferSchema.safeParse(listOffer).success).toBe(true);
    expect(publicOfferDetailSchema.safeParse(offer(1, 100)).success).toBe(true);
  });

  it("keeps phone content independent and retries the exact Variant Offer request", async () => {
    let attempts = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/offers/`, () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        const listOffer = { ...offer(1, 100) };
        delete listOffer.created_at;
        delete listOffer.updated_at;
        return HttpResponse.json({ count: 1, next: null, previous: null, results: [listOffer] });
      }),
    );

    render(
      <AuthContext.Provider value={auth}>
        <div>مشخصات گوشی</div>
        <VariantOffersSection variantId={31} page={1} ordering="price" />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("مشخصات گوشی")).toBeVisible();
    expect(await screen.findByText("پیشنهادها بارگذاری نشدند")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "تلاش دوباره" }));
    await waitFor(() => expect(screen.getByText("فروشگاه 1")).toBeVisible());
    expect(attempts).toBe(2);
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


const customerAuth: AuthContextValue = {
  ...auth,
  status: "authenticated",
  user: {
    id: 7,
    username: "customer",
    email: "customer@example.com",
    is_staff: false,
    is_superuser: false,
    account_type: "customer",
    created_at: "2026-07-27T12:00:00Z",
    role: "customer",
  },
  hasRole: (role) => role === "customer",
};

const staffAuth: AuthContextValue = {
  ...auth,
  status: "authenticated",
  user: {
    id: 9,
    username: "staff",
    email: "staff@example.com",
    is_staff: true,
    is_superuser: false,
    account_type: null,
    created_at: "2026-07-27T12:00:00Z",
    role: "staff",
  },
  hasRole: (role) => role === "staff",
};

describe("FE019 personalized Torobche explanation", () => {
  it("keeps the public phone experience available to guests without calling the protected endpoint", async () => {
    let calls = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () => {
        calls += 1;
        return HttpResponse.json({ phone_id: 31, description: "نباید نمایش داده شود" });
      }),
    );

    render(
      <AuthContext.Provider value={auth}>
        <div>مشخصات عمومی گوشی</div>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("مشخصات عمومی گوشی")).toBeVisible();
    expect(screen.getByText("برای دیدن تحلیل شخصی تربچه، ابتدا وارد حساب خود شوید.")).toBeVisible();
    expect(screen.getByRole("link", { name: "ورود و مشاهده تحلیل شخصی" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fphones%2F31",
    );
    await waitFor(() => expect(calls).toBe(0));
  });

  it("calls the canonical authenticated endpoint with the exact route variant and renders safe Persian structure", async () => {
    let requestUrl = "";
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({
          phone_id: 31,
          description:
            "**نتیجه‌گیری اولیه**\n\nاین مدل بخشی از نیازهای شما را پوشش می‌دهد.\n\n**دلایل اصلی خرید**\n\n- رم ۱۲ گیگابایت\n- حافظه ۲۵۶ گیگابایت",
        });
      }),
    );

    render(
      <AuthContext.Provider value={customerAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(await screen.findByRole("heading", { name: "نتیجه‌گیری اولیه" })).toBeVisible();
    expect(screen.getByText("رم ۱۲ گیگابایت")).toBeVisible();
    expect(requestUrl).toBe(`${baseUrl}/catalog/device-variants/31/explanation/`);
  });

  it("rejects a mismatched response phone ID and does not render it as success", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () =>
        HttpResponse.json({ phone_id: 99, description: "متن اشتباه" }),
      ),
    );

    render(
      <AuthContext.Provider value={customerAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(await screen.findByText("پاسخ تحلیل شخصی معتبر نبود")).toBeVisible();
    expect(screen.queryByText("متن اشتباه")).toBeNull();
  });

  it("maps missing Torobche context to a dedicated recovery action", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () =>
        HttpResponse.json(
          {
            code: "torobche_context_required",
            detail: "برای دریافت توضیح شخصی‌سازی‌شده ابتدا نیازهای خود را با تربچه مشخص کنید.",
          },
          { status: 409 },
        ),
      ),
    );

    render(
      <AuthContext.Provider value={customerAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(await screen.findByText("ابتدا نیازهای خود را با تربچه مشخص کنید")).toBeVisible();
    expect(screen.getByRole("link", { name: "گفت‌وگو با تربچه" })).toHaveAttribute(
      "href",
      "/torobche",
    );
  });

  it("shows provider unavailability without exposing the raw provider error", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () =>
        HttpResponse.json({
          phone_id: 31,
          description: null,
          error: "AI explanation temporarily unavailable",
        }),
      ),
    );

    render(
      <AuthContext.Provider value={customerAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(await screen.findByText("تحلیل شخصی فعلاً در دسترس نیست")).toBeVisible();
    expect(screen.queryByText("AI explanation temporarily unavailable")).toBeNull();
  });

  it("does not call the explanation endpoint for staff", async () => {
    let calls = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () => {
        calls += 1;
        return HttpResponse.json({ phone_id: 31, description: "نباید نمایش داده شود" });
      }),
    );

    render(
      <AuthContext.Provider value={staffAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("تحلیل شخصی تربچه برای حساب‌های مشتری و فروشگاه در دسترس است.")).toBeVisible();
    await waitFor(() => expect(calls).toBe(0));
  });

  it("renders backend text as text rather than executable HTML", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/catalog/device-variants/31/explanation/`, () =>
        HttpResponse.json({
          phone_id: 31,
          description: "<script>window.bad = true</script>\n\n- محدودیت واقعی",
        }),
      ),
    );

    render(
      <AuthContext.Provider value={customerAuth}>
        <PersonalizedExplanationSection variantId={31} />
      </AuthContext.Provider>,
    );

    expect(await screen.findByText("<script>window.bad = true</script>")).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
  });
});
