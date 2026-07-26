import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { ApiClient, ApiError, createMemoryTokenProvider } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://127.0.0.1:8000/api";

describe("FE003 API client", () => {
  it("handles JSON, empty responses, auth headers, and idempotency keys", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/public/`, ({ request }) => {
        expect(request.headers.has("authorization")).toBe(false);
        return HttpResponse.json({ ok: true });
      }),
      http.post(`${baseUrl}/private/`, ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer access-token");
        expect(request.headers.get("idempotency-key")).toBe("same-action-key");
        expect(request.headers.get("content-type")).toContain("application/json");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = new ApiClient({
      baseUrl,
      tokenProvider: createMemoryTokenProvider("access-token"),
    });
    await expect(client.request<{ ok: boolean }>("public/")).resolves.toEqual({ ok: true });
    await expect(
      client.request<void, { value: number }>("private/", {
        method: "POST",
        auth: true,
        json: { value: 1 },
        idempotencyKey: "same-action-key",
      }),
    ).resolves.toBeUndefined();
  });

  it("normalizes DRF validation and conflict errors", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/validation/`, () =>
        HttpResponse.json(
          { email: ["Invalid."], non_field_errors: ["Try again."] },
          { status: 400 },
        ),
      ),
      http.post(`${baseUrl}/conflict/`, () =>
        HttpResponse.json({ code: "offer_already_exists", detail: "Duplicate." }, { status: 409 }),
      ),
    );
    const client = new ApiClient({ baseUrl });
    await expect(client.request("validation/", { method: "POST" })).rejects.toMatchObject({
      code: "validation_error",
      fieldErrors: { email: ["Invalid."], non_field_errors: ["Try again."] },
    });
    await expect(client.request("conflict/", { method: "POST" })).rejects.toMatchObject({
      code: "conflict",
      backendCode: "offer_already_exists",
    });
  });

  it("deduplicates concurrent refresh and retries each request once", async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/protected/`, ({ request }) => {
        protectedCalls += 1;
        return request.headers.get("authorization") === "Bearer fresh-token"
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: "token_not_valid", detail: "Expired." }, { status: 401 });
      }),
      http.post(`${baseUrl}/auth/token/refresh/`, async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({ access: "fresh-token" });
      }),
    );
    const provider = createMemoryTokenProvider("expired-token");
    const client = new ApiClient({ baseUrl, tokenProvider: provider });
    await expect(
      Promise.all([
        client.request("protected/", { auth: true }),
        client.request("protected/", { auth: true }),
        client.request("protected/", { auth: true }),
      ]),
    ).resolves.toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(6);
    expect(provider.getAccessToken()).toBe("fresh-token");
  });

  it("clears the token and rejects all waiters after refresh failure", async () => {
    let refreshCalls = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/protected/`, () =>
        HttpResponse.json({ detail: "Expired." }, { status: 401 }),
      ),
      http.post(`${baseUrl}/auth/token/refresh/`, () => {
        refreshCalls += 1;
        return HttpResponse.json(
          { code: "refresh_token_invalid", detail: "Invalid." },
          { status: 400 },
        );
      }),
    );
    const provider = createMemoryTokenProvider("expired-token");
    const client = new ApiClient({ baseUrl, tokenProvider: provider });
    const results = await Promise.allSettled([
      client.request("protected/", { auth: true }),
      client.request("protected/", { auth: true }),
      client.request("protected/", { auth: true }),
    ]);
    expect(refreshCalls).toBe(1);
    expect(provider.getAccessToken()).toBeNull();
    expect(
      results.every(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof ApiError &&
          result.reason.code === "unauthenticated",
      ),
    ).toBe(true);
  });

  it("distinguishes caller cancellation from timeout", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/slow/`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ ok: true });
      }),
    );
    const client = new ApiClient({ baseUrl });
    const controller = new AbortController();
    const aborted = client.request("slow/", { signal: controller.signal });
    controller.abort();
    await expect(aborted).rejects.toMatchObject({ code: "aborted", retryable: false });
    await expect(client.request("slow/", { timeoutMs: 1 })).rejects.toMatchObject({
      code: "timeout",
      retryable: true,
    });
  });

  it("rejects invalid JSON as an invalid response", async () => {
    apiMockServer.use(
      http.get(
        `${baseUrl}/invalid/`,
        () => new HttpResponse("{", { headers: { "Content-Type": "application/json" } }),
      ),
    );
    const client = new ApiClient({ baseUrl });
    await expect(client.request("invalid/")).rejects.toMatchObject({ code: "invalid_response" });
  });
});
