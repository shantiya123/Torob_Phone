import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api/client";
import { catalogApi } from "@/lib/api/catalog";
import { offersApi } from "@/lib/api/offers";
import { storesApi } from "@/lib/api/stores";

function clientFor(payload: unknown, status = 200) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  }));
  const client = new ApiClient({ baseUrl: "http://api.test/api", fetch: fetch as typeof globalThis.fetch });
  client.tokenProvider.setAccessToken("token");
  return { client, fetch };
}

describe("FE021 Create Store Offer contract", () => {
  it("uses the Store-only paginated catalog search", async () => {
    const { client, fetch } = clientFor({ count: 0, next: null, previous: null, results: [] });
    await catalogApi.phones({ page: 2, pageSize: 12, search: "Galaxy" }, client);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/catalog/phones/?page=2&page_size=12&search=Galaxy",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("retrieves exact available variants from the Store catalog parent detail", async () => {
    const response = { id: 12, brand: "Samsung", model: "Galaxy", image_url: null, release_date: null, variants: [] };
    const { client, fetch } = clientFor(response);
    await catalogApi.phone(12, client);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/api/catalog/phones/12/",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("submits the exact creation body without Store, availability or UI-only fields", async () => {
    const response = { id: 7, device_variant: 31, price: 35_000_000, quantity: 4, description: "Global version" };
    const { client, fetch } = clientFor(response, 201);
    const result = await offersApi.create({ device_variant: 31, price: 35_000_000, quantity: 4, description: "Global version" }, client);
    expect(result).toEqual(response);
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(fetch.mock.calls[0]?.[0]).toBe("http://api.test/api/offers/");
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toEqual({ device_variant: 31, price: 35_000_000, quantity: 4, description: "Global version" });
    expect(new Headers(request.headers).has("Idempotency-Key")).toBe(false);
  });

  it("rejects an invalid successful creation response", async () => {
    const { client } = clientFor({ id: 7, device_variant: { id: 31 }, price: 35_000_000, quantity: 4 }, 201);
    await expect(offersApi.create({ device_variant: 31, price: 35_000_000, quantity: 4, description: null }, client)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("strictly validates the Store operational access boundary", async () => {
    const response = {
      store: { id: 1, name: "Store", slug: "store", logo: null, status: "pending", rejection_reason: "" },
      generated_at: "2026-07-28T00:00:00Z",
      operational_access: false,
      reason: "store_not_active",
      offers: null,
      orders: null,
      recent_orders: [],
      recent_offers: [],
    };
    const { client } = clientFor(response);
    await expect(storesApi.dashboard(client)).resolves.toEqual(response);
  });
});
