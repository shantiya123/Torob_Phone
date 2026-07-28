import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context";
import { GuestOnly } from "@/features/auth/components/guards";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

const errorContext: AuthContextValue = {
  status: "error",
  user: null,
  error: { message: "The network request failed.", retryable: true },
  login: vi.fn(),
  registerCustomer: vi.fn(),
  updateEmail: vi.fn(),
  refreshCurrentUser: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  hasRole: () => false,
};

describe("GuestOnly recovery", () => {
  beforeEach(() => replace.mockClear());

  it("keeps login and registration content usable when restoration fails", () => {
    render(
      <AuthContext.Provider value={errorContext}>
        <GuestOnly>
          <p>فرم ورود</p>
        </GuestOnly>
      </AuthContext.Provider>,
    );
    expect(screen.getByText("فرم ورود")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
