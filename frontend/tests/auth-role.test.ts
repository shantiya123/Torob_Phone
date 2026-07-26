import { describe, expect, it } from "vitest";
import { destinationFor, safeNextPath } from "@/features/auth/utils/redirect";
import { resolveAuthenticatedUser } from "@/features/auth/types";
import type { CurrentUser } from "@/types/api";

const base: CurrentUser = {
  id: 1,
  username: "user",
  email: "user@example.test",
  is_staff: false,
  is_superuser: false,
  account_type: "customer",
  created_at: null,
};

describe("FE004 role and redirect policy", () => {
  it("gives Staff precedence and supports Staff without a profile", () => {
    const staff = resolveAuthenticatedUser({ ...base, account_type: null, is_staff: true });
    expect(staff.role).toBe("staff");
    expect(resolveAuthenticatedUser({ ...base, account_type: "store" }).role).toBe("store");
  });

  it("rejects unknown role contracts instead of defaulting to Customer", () => {
    expect(() => resolveAuthenticatedUser({ ...base, account_type: null })).toThrow();
  });

  it("accepts local next paths and rejects open redirects", () => {
    expect(safeNextPath("/basket?step=1")).toBe("/basket?step=1");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(destinationFor("customer", "/store/dashboard")).toBe("/");
    expect(destinationFor("store", "/catalog")).toBe("/catalog");
    expect(destinationFor("staff", null)).toBe("/staff/store-reviews");
  });
});
