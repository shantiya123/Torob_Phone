import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutExperience } from "@/features/checkout/components/checkout-experience";
import { basketApi } from "@/lib/api/basket";
import { ordersApi } from "@/lib/api/orders";
import { walletApi } from "@/lib/api/wallet";
import { ApiError } from "@/lib/api/errors";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({ default: ({ fill: _fill, ...props }: Record<string, unknown>) => <img {...props} /> }));
vi.mock("@/lib/api/basket", () => ({ basketApi: { get: vi.fn() } }));
vi.mock("@/lib/api/wallet", () => ({ walletApi: { get: vi.fn() } }));
vi.mock("@/lib/api/orders", () => ({ ordersApi: { checkout: vi.fn() } }));

const item = {
  id: 2,
  offer: {
    id: 7,
    device_variant: { id: 31, brand: "Samsung", model_name: "Galaxy M47", device_kind: "smartphone", image_url: null, storage_gb: 128, ram_gb: 8, storage_technology: "UFS", is_available: true },
    store: { id: 1, name: "Mobile Center", slug: "mobile-center", logo: null },
    price: 35_000_000, quantity: 3, available: true, description: null,
    created_at: "2026-07-27T12:00:00Z", updated_at: "2026-07-27T12:00:00Z",
  },
  quantity: 1, unit_price: 35_000_000, total: 35_000_000,
  expires_at: "2026-07-27T13:00:00Z", remaining_seconds: 600,
  created_at: "2026-07-27T12:00:00Z", updated_at: "2026-07-27T12:00:00Z",
};
const basket = { id: 1, items: [item], total: 35_000_000, next_expiration_at: item.expires_at, created_at: item.created_at, updated_at: item.updated_at };
const wallet = { id: 1, balance: 50_000_000, created_at: item.created_at, updated_at: item.updated_at };
const result = { checkout_id: "12", orders: [{ id: 8, status: "paid" as const, store: { id: 1, name: "Mobile Center" }, item_count: 1, total: 35_000_000, created_at: item.created_at, updated_at: item.updated_at }], order_count: 1, total: 35_000_000, wallet_balance: 15_000_000 };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "stable-key") });
  vi.mocked(basketApi.get).mockResolvedValue(basket);
  vi.mocked(walletApi.get).mockResolvedValue(wallet);
  vi.mocked(ordersApi.checkout).mockResolvedValue(result);
});

describe("FE012 Customer Checkout", () => {
  it("freshly loads Basket and Wallet and renders authoritative review", async () => {
    render(<CheckoutExperience />);
    expect(await screen.findByRole("heading", { name: "تسویه حساب" })).toBeInTheDocument();
    expect(basketApi.get).toHaveBeenCalledTimes(1);
    expect(walletApi.get).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Samsung Galaxy M47/ })).toHaveAttribute("href", "/phones/31");
    expect(screen.getByRole("link", { name: "مشاهده فروشگاه" })).toHaveAttribute("href", "/stores/1");
    expect(screen.getAllByText(/۳۵٬۰۰۰٬۰۰۰ تومان/).length).toBeGreaterThan(1);
  });

  it("submits once with one stable idempotency key and hands off the multi-order result", async () => {
    let resolve!: (value: typeof result) => void;
    vi.mocked(ordersApi.checkout).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<CheckoutExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "تأیید خرید و پرداخت از کیف پول" }));
    const confirm = screen.getByRole("button", { name: "ثبت سفارش و پرداخت" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(ordersApi.checkout).toHaveBeenCalledTimes(1);
    expect(ordersApi.checkout).toHaveBeenCalledWith("stable-key");
    await act(async () => resolve(result));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/confirmation?checkoutId=12"));
    expect(sessionStorage.getItem("torob-phone:checkout-result:12")).toContain('"orders"');
  });

  it("reuses the same key after an uncertain network outcome", async () => {
    vi.mocked(ordersApi.checkout).mockRejectedValueOnce(new ApiError({ code: "network_error", message: "network", retryable: true })).mockResolvedValueOnce(result);
    render(<CheckoutExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "تأیید خرید و پرداخت از کیف پول" }));
    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش و پرداخت" }));
    fireEvent.click(await screen.findByRole("button", { name: "بررسی دوباره همین تلاش" }));
    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(2));
    expect(vi.mocked(ordersApi.checkout).mock.calls[0]?.[0]).toBe("stable-key");
    expect(vi.mocked(ordersApi.checkout).mock.calls[1]?.[0]).toBe("stable-key");
  });

  it("blocks submission for empty Basket or insufficient Wallet", async () => {
    vi.mocked(basketApi.get).mockResolvedValueOnce({ ...basket, items: [], total: 0, next_expiration_at: null });
    const { unmount } = render(<CheckoutExperience />);
    expect(await screen.findByText("سبدی برای تسویه وجود ندارد")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تأیید خرید/ })).not.toBeInTheDocument();
    unmount();
    vi.mocked(basketApi.get).mockResolvedValue(basket);
    vi.mocked(walletApi.get).mockResolvedValue({ ...wallet, balance: 1 });
    render(<CheckoutExperience />);
    expect(await screen.findByRole("link", { name: "رفتن به کیف پول" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByRole("button", { name: "تأیید خرید و پرداخت از کیف پول" })).toBeDisabled();
  });

  it("refetches after a conclusive reservation conflict without showing success", async () => {
    vi.mocked(ordersApi.checkout).mockRejectedValue(new ApiError({ code: "conflict", backendCode: "basket_reservation_expired", message: "expired", status: 409 }));
    render(<CheckoutExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "تأیید خرید و پرداخت از کیف پول" }));
    fireEvent.click(screen.getByRole("button", { name: "ثبت سفارش و پرداخت" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/زمان رزرو/);
    await waitFor(() => expect(basketApi.get).toHaveBeenCalledTimes(2));
    expect(push).not.toHaveBeenCalled();
  });
});
