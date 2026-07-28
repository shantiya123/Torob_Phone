import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountExperience } from "@/features/account/components/account-experience";
import { AuthContext, type AuthContextValue } from "@/features/auth/context/auth-context";
import { getAccountRoleLabel } from "@/features/account/lib/account-role";
import type { AuthenticatedUser } from "@/features/auth/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const customer: AuthenticatedUser = {
  id: 17,
  username: "soroush",
  email: "soroush@example.test",
  is_staff: false,
  is_superuser: false,
  account_type: "customer",
  role: "customer",
  created_at: "2026-07-20T10:00:00Z",
};

function renderAccount(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: "authenticated",
    user: customer,
    error: null,
    login: vi.fn(),
    registerCustomer: vi.fn(),
    updateEmail: vi.fn(async (email: string) => ({ ...customer, email })),
    logout: vi.fn(async () => undefined),
    refreshCurrentUser: vi.fn(async () => customer),
    refreshSession: vi.fn(async () => customer),
    hasRole: (role) => role === "customer",
    ...overrides,
  };
  return {
    value,
    ...render(
      <AuthContext.Provider value={value}>
        <AccountExperience />
      </AuthContext.Provider>,
    ),
  };
}

beforeEach(() => {
  replace.mockReset();
});

describe("FE017 Customer Account", () => {
  it("retrieves and renders backend account identity", async () => {
    const { value } = renderAccount();
    expect(await screen.findByRole("heading", { name: "حساب کاربری" })).toBeInTheDocument();
    expect(value.refreshCurrentUser).toHaveBeenCalledTimes(1);
    expect(screen.getByText("soroush")).toBeInTheDocument();
    expect(screen.getByDisplayValue("soroush@example.test")).toBeInTheDocument();
    expect(screen.getByText("مشتری")).toBeInTheDocument();
  });

  it("links to Basket, Orders, and Wallet without fake counts", async () => {
    renderAccount();
    await screen.findByText("soroush");
    expect(screen.getByRole("link", { name: /سبد خرید/ })).toHaveAttribute("href", "/basket");
    expect(screen.getByRole("link", { name: /سفارش‌ها/ })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: /کیف پول/ })).toHaveAttribute("href", "/wallet");
    expect(screen.queryByText(/سفارش پرداخت‌نشده|تعداد تراکنش|مجموع خرید/)).not.toBeInTheDocument();
  });

  it("updates only email after backend confirmation and synchronizes auth state", async () => {
    let resolveUpdate!: (value: AuthenticatedUser) => void;
    const updateEmail = vi.fn(() => new Promise<AuthenticatedUser>((resolve) => { resolveUpdate = resolve; }));
    renderAccount({ updateEmail });
    const input = await screen.findByLabelText("ایمیل");
    fireEvent.change(input, { target: { value: "new@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره ایمیل" }));
    expect(updateEmail).toHaveBeenCalledWith("new@example.test");
    expect(screen.getByDisplayValue("new@example.test")).toBeInTheDocument();
    resolveUpdate({ ...customer, email: "confirmed@example.test" });
    expect(await screen.findByDisplayValue("confirmed@example.test")).toBeInTheDocument();
    expect(screen.getByText(/با تأیید سرور به‌روزرسانی شد/)).toBeInTheDocument();
  });

  it("preserves confirmed identity when email update fails", async () => {
    const updateEmail = vi.fn().mockRejectedValue(new Error("offline"));
    renderAccount({ updateEmail });
    const input = await screen.findByLabelText("ایمیل");
    fireEvent.change(input, { target: { value: "failed@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره ایمیل" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("soroush")).toBeInTheDocument();
  });

  it("shows retry when account retrieval fails and performs a fresh request", async () => {
    const refreshCurrentUser = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(customer);
    renderAccount({ refreshCurrentUser });
    fireEvent.click(await screen.findByRole("button", { name: "تلاش دوباره" }));
    expect(await screen.findByText("soroush")).toBeInTheDocument();
    expect(refreshCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("reuses existing logout and prevents duplicate activation", async () => {
    const logout = vi.fn(() => new Promise<void>(() => undefined));
    renderAccount({ logout });
    const button = await screen.findByRole("button", { name: "خروج از حساب" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("does not add unsupported password or account-deletion forms", async () => {
    renderAccount();
    await screen.findByText("soroush");
    expect(screen.queryByLabelText(/رمز عبور/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /حذف حساب/ })).not.toBeInTheDocument();
  });

  it("maps unknown roles safely", () => {
    expect(getAccountRoleLabel("future-role")).toBe("نقش نامشخص");
  });
});
