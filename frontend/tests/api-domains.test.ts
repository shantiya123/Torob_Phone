import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { ApiClient, createMemoryTokenProvider, storesApi, walletApi } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://127.0.0.1:8000/api";

describe("FE003 domain APIs", () => {
  it("keeps public Store contracts private-field free", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/stores/`, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: "Mobile Center", slug: "mobile-center", logo: null }],
        }),
      ),
    );
    const result = await storesApi.list({}, new ApiClient({ baseUrl }));
    expect(result.results[0]).toEqual({
      id: 1,
      name: "Mobile Center",
      slug: "mobile-center",
      logo: null,
    });
    expect(result.results[0]).not.toHaveProperty("business_phone");
    expect(result.results[0]).not.toHaveProperty("legal_profile");

    apiMockServer.use(
      http.get(`${baseUrl}/stores/`, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              name: "Mobile Center",
              slug: "mobile-center",
              logo: null,
              business_phone: "private",
            },
          ],
        }),
      ),
    );
    await expect(storesApi.list({}, new ApiClient({ baseUrl }))).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("requires caller-owned idempotency for Wallet charges", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/wallet/charge/`, ({ request }) => {
        expect(request.headers.get("idempotency-key")).toBe("wallet-action-1");
        return HttpResponse.json(
          {
            wallet: {
              id: 1,
              balance: 5_000_000,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
            transaction: {
              id: 2,
              amount: 5_000_000,
              balance_after: 5_000_000,
              transaction_type: "charge",
              order: null,
              created_at: "2026-01-01T00:00:00Z",
            },
          },
          { status: 201 },
        );
      }),
    );
    const client = new ApiClient({ baseUrl, tokenProvider: createMemoryTokenProvider("token") });
    const response = await walletApi.charge(5_000_000, "wallet-action-1", client);
    expect(response.wallet.balance).toBe(5_000_000);
  });
});
