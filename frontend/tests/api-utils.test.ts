import { describe, expect, it, vi } from "vitest";
import { normalizeApiBaseUrl } from "@/config/env";
import {
  ApiError,
  createIdempotencyKey,
  buildQuery,
  paginationQuery,
  moneySchema,
} from "@/lib/api";

describe("FE003 API utilities", () => {
  it("normalizes valid base URLs and rejects invalid values", () => {
    expect(normalizeApiBaseUrl("https://example.com/api///")).toBe("https://example.com/api");
    expect(() => normalizeApiBaseUrl("ftp://example.com/api")).toThrow();
    expect(() => normalizeApiBaseUrl("https://example.com/api/api")).toThrow();
  });

  it("builds deterministic queries and maps pagination names", () => {
    expect(buildQuery({ search: "Galaxy", page_size: 20, page: 2, empty: undefined })).toBe(
      "?page=2&page_size=20&search=Galaxy",
    );
    expect(paginationQuery({ page: 2, pageSize: 100 })).toEqual({ page: 2, page_size: 100 });
    expect(() => paginationQuery({ pageSize: 101 })).toThrow(RangeError);
  });

  it("accepts only safe integer money", () => {
    expect(moneySchema.parse(10_000_000)).toBe(10_000_000);
    expect(() => moneySchema.parse(1.2)).toThrow();
    expect(() => moneySchema.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it("creates secure UUID idempotency keys", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
    expect(createIdempotencyKey()).toBe("123e4567-e89b-12d3-a456-426614174000");
    randomUUID.mockRestore();
  });

  it("keeps normalized API errors type-safe", () => {
    const error = new ApiError({
      code: "conflict",
      status: 409,
      message: "Conflict",
      backendCode: "offer_already_exists",
    });
    expect(error.retryable).toBe(false);
    expect(error.backendCode).toBe("offer_already_exists");
  });
});
