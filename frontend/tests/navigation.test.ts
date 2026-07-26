import { describe, expect, it } from "vitest";
import {
  isNavigationActive,
  primaryNavigation,
  roleNavigation,
} from "@/components/shell/navigation";

describe("shell navigation", () => {
  it("keeps the home item exact while nested routes stay active under their parent", () => {
    expect(isNavigationActive("/", primaryNavigation[0]!)).toBe(true);
    expect(isNavigationActive("/stores/center-1", primaryNavigation[2]!)).toBe(true);
    expect(isNavigationActive("/stores", primaryNavigation[0]!)).toBe(false);
  });

  it("exposes only role-approved destinations", () => {
    expect(roleNavigation.customer.map((item) => item.href)).toEqual(["/basket", "/account"]);
    expect(roleNavigation.store.map((item) => item.href)).toEqual(["/store/dashboard"]);
    expect(roleNavigation.staff.map((item) => item.href)).toEqual(["/staff/store-reviews"]);
  });
});
