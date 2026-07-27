import { HttpResponse, http } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context";
import { RequireTorobcheAccess } from "@/features/auth/components/guards";
import { TorobcheCharacter } from "@/features/torobche/components/torobche-character";
import { TorobcheExperience } from "@/features/torobche/components/torobche-experience";
import { activeCriteria } from "@/features/torobche/query-set";
import {
  clearTorobcheSession,
  readTorobcheSession,
  TOROBCHE_SESSION_KEY,
  writeTorobcheSession,
} from "@/features/torobche/session";
import { ApiClient } from "@/lib/api";
import { torobcheApi } from "@/lib/api/torobche";
import type { TorobcheQuerySet, TorobcheSearchResponse } from "@/types/api";
import { apiMockServer } from "./setup";

vi.mock("next/navigation", () => ({
  usePathname: () => "/torobche",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const baseUrl = "http://localhost:8000/api";
const range = () => ({ min: null, max: null });
const querySet: TorobcheQuerySet = {
  brand: "Samsung",
  model: null,
  release_date: null,
  source: { name: null, url: null },
  performance: {
    chipset: null,
    cpu: null,
    gpu: null,
    storage_type: null,
    variants: { ram_gb: range(), storage_gb: { min: 256, max: null } },
  },
  display: {
    size_inches: range(),
    resolution_width: range(),
    resolution_height: range(),
    technology: null,
    refresh_rate_hz: range(),
    brightness_peak_nits: range(),
    hdr: null,
  },
  battery: { capacity_mah: { min: 5000, max: null }, charging_w: range(), wireless_charging: null },
  camera: {
    main_mp: range(),
    ultrawide_mp: range(),
    macro_mp: range(),
    selfie_mp: range(),
    ois: null,
    video_max_resolution: null,
    video_max_fps: range(),
  },
  connectivity: { "5g": null, wifi_version: null, bluetooth_version: null, nfc: null },
  physical: { weight_g: range(), ip_rating: null },
  software: { os: null, android_version: range(), major_updates: range() },
  benchmarks: { antutu: range(), geekbench: range(), "3dmark": range() },
  price: { min: null, max: 30_000_000 },
};

const response: TorobcheSearchResponse = {
  message: "این مدل‌ها با نیاز شما هماهنگ‌اند.",
  queryset: querySet,
  query_set: querySet,
  count: 1,
  next: null,
  previous: null,
  ordering: "newest",
  results: [
    {
      id: 31,
      brand: "Samsung",
      model_name: "Galaxy A",
      device_kind: "phone",
      image_url: null,
      storage_gb: 256,
      ram_gb: 8,
      storage_technology: "UFS",
      is_available: true,
      minimum_available_price: 29_000_000,
    },
  ],
};

const customerAuth: AuthContextValue = {
  status: "authenticated",
  user: {
    id: 1,
    username: "customer",
    email: "customer@example.test",
    is_staff: false,
    is_superuser: false,
    account_type: "customer",
    created_at: null,
    role: "customer",
  },
  error: null,
  login: async () => {
    throw new Error("not used");
  },
  registerCustomer: async () => undefined,
  logout: async () => undefined,
  refreshSession: async () => null,
  hasRole: (role) => role === "customer",
};

describe("FE009 Torobche", () => {
  it("posts the natural-language contract through the authenticated API layer", async () => {
    let authorization = "";
    let requestBody: unknown;
    apiMockServer.use(
      http.post(`${baseUrl}/search/`, async ({ request }) => {
        authorization = request.headers.get("authorization") ?? "";
        requestBody = await request.json();
        return HttpResponse.json(response);
      }),
    );
    const client = new ApiClient({ baseUrl });
    client.tokenProvider.setAccessToken("memory-token");
    const result = await torobcheApi.search(
      { message: "باتری قوی", ordering: "newest" },
      1,
      undefined,
      client,
    );
    expect(authorization).toBe("Bearer memory-token");
    expect(requestBody).toEqual({ message: "باتری قوی", ordering: "newest" });
    expect(result.results[0]?.id).toBe(31);
  });

  it("serializes only session transcript state and safely rejects malformed storage", () => {
    const storage = {
      value: "",
      getItem: () => storage.value,
      setItem: (_key: string, value: string) => {
        storage.value = value;
      },
      removeItem: () => {
        storage.value = "";
      },
    };
    expect(readTorobcheSession(storage)).toBeNull();
    writeTorobcheSession(storage, { version: 1, history: [], querySet, ordering: "newest" });
    expect(readTorobcheSession(storage)?.querySet?.brand).toBe("Samsung");
    clearTorobcheSession(storage);
    expect(storage.value).toBe("");
  });

  it("renders only active backend-confirmed QuerySet criteria", () => {
    const criteria = activeCriteria(querySet);
    expect(criteria.some((item) => item.label === "برند" && item.value === "Samsung")).toBe(true);
    expect(criteria.some((item) => item.label === "بازهٔ قیمت")).toBe(true);
    expect(criteria.some((item) => item.path === "source.name")).toBe(false);
  });

  it("keeps the fallback character isolated behind semantic states", () => {
    render(<TorobcheCharacter state="thinking" compact />);
    expect(screen.getByText("در حال بررسی درخواست شما")).toBeVisible();
    expect(screen.getByText("در حال بررسی درخواست شما").parentElement).toHaveAttribute(
      "data-character-state",
      "thinking",
    );
  });

  it("denies Staff before protected Torobche content mounts", () => {
    const staffAuth: AuthContextValue = {
      ...customerAuth,
      user: {
        ...customerAuth.user!,
        is_staff: true,
        account_type: null,
        role: "staff",
      },
      hasRole: (role) => role === "staff",
    };
    render(
      <AuthContext.Provider value={staffAuth}>
        <RequireTorobcheAccess>
          <p>protected search</p>
        </RequireTorobcheAccess>
      </AuthContext.Provider>,
    );
    expect(screen.getByText("دسترسی مجاز نیست")).toBeVisible();
    expect(screen.queryByText("protected search")).toBeNull();
  });

  it("contracts to exact results after a successful request", async () => {
    window.sessionStorage.removeItem(TOROBCHE_SESSION_KEY);
    apiMockServer.use(
      http.get(`${baseUrl}/search/state/`, () =>
        HttpResponse.json({
          queryset: querySet,
          query_set: querySet,
          has_active_filters: false,
          updated_at: null,
        }),
      ),
      http.post(`${baseUrl}/search/`, () => HttpResponse.json(response)),
    );
    const client = new ApiClient({ baseUrl });
    client.tokenProvider.setAccessToken("test-token");
    render(
      <AuthContext.Provider value={customerAuth}>
        <TorobcheExperience client={client} />
      </AuthContext.Provider>,
    );
    const input = screen.getByLabelText("چه گوشی‌ای برایت مناسب است؟");
    fireEvent.change(input, { target: { value: "سامسونگ با باتری قوی" } });
    fireEvent.submit(screen.getByRole("form", { name: "جست‌وجوی تربچه" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /نتیجه برای جست‌وجوی شما/ })).toBeVisible(),
    );
    expect(screen.getByRole("link", { name: "مشاهده" })).toHaveAttribute("href", "/phones/31");
    expect(screen.getAllByText("Samsung")).toHaveLength(2);
  });
});
