import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BasketExperience } from "@/features/basket/components/basket-experience";
import { basketApi } from "@/lib/api/basket";
import { walletApi } from "@/lib/api/wallet";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));
vi.mock("@/lib/api/basket", () => ({ basketApi: { get: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("@/lib/api/wallet", () => ({ walletApi: { get: vi.fn() } }));

const offer = {
  id: 7,
  device_variant: { id: 31, brand: "Samsung", model_name: "Galaxy M47", device_kind: "smartphone", image_url: null, storage_gb: 128, ram_gb: 8, storage_technology: "UFS", is_available: true },
  store: { id: 1, name: "Mobile Center", slug: "mobile-center", logo: null },
  price: 35_000_000,
  quantity: 3,
  available: true,
  description: null,
  created_at: "2026-07-27T12:00:00Z",
  updated_at: "2026-07-27T12:00:00Z",
};
const item = { id: 2, offer, quantity: 1, unit_price: 35_000_000, total: 35_000_000, expires_at: "2026-07-27T13:00:00Z", remaining_seconds: 600, created_at: "2026-07-27T12:00:00Z", updated_at: "2026-07-27T12:00:00Z" };
const basket = { id: 1, items: [item], total: 35_000_000, next_expiration_at: item.expires_at, created_at: item.created_at, updated_at: item.updated_at };
const wallet = { id: 1, balance: 50_000_000, created_at: item.created_at, updated_at: item.updated_at };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(basketApi.get).mockResolvedValue(basket);
  vi.mocked(walletApi.get).mockResolvedValue(wallet);
});

describe("FE011 Customer Basket", () => {
  it("renders exact Store and variant identity with backend totals", async () => {
    render(<BasketExperience />);
    expect(await screen.findByRole("link", { name: /Samsung Galaxy M47/ })).toHaveAttribute("href", "/phones/31");
    expect(screen.getByRole("link", { name: /Mobile Center/ })).toHaveAttribute("href", "/stores/1");
    expect(screen.getAllByText(/۳۵٬۰۰۰٬۰۰۰ تومان/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/پاک کردن همه/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ادامه برای پرداخت/ })).toHaveAttribute("href", "/checkout");
  });

  it("PATCHes the Basket item and updates only after backend confirmation", async () => {
    let resolve!: (value: typeof item) => void;
    vi.mocked(basketApi.update).mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<BasketExperience />);
    await screen.findByText(/Galaxy M47/);
    fireEvent.click(screen.getByRole("button", { name: "افزایش تعداد" }));
    expect(basketApi.update).toHaveBeenCalledWith(2, 2);
    expect(screen.getByText("۱")).toBeInTheDocument();
    await act(async () => resolve({ ...item, quantity: 2, total: 70_000_000 }));
    await waitFor(() => expect(basketApi.get).toHaveBeenCalledTimes(2));
  });

  it("keeps the previous confirmed quantity when PATCH fails", async () => {
    vi.mocked(basketApi.update).mockRejectedValue(new Error("failed"));
    render(<BasketExperience />);
    await screen.findByText(/Galaxy M47/);
    fireEvent.click(screen.getByRole("button", { name: "افزایش تعداد" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("۱")).toBeInTheDocument();
  });

  it("keeps an item visible until DELETE succeeds", async () => {
    let resolve!: () => void;
    vi.mocked(basketApi.remove).mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    render(<BasketExperience />);
    await screen.findByText(/Galaxy M47/);
    fireEvent.click(screen.getByRole("button", { name: /حذف Samsung Galaxy M47/ }));
    expect(basketApi.remove).toHaveBeenCalledWith(2);
    expect(screen.getByText(/Galaxy M47/)).toBeInTheDocument();
    await act(async () => resolve());
    await waitFor(() => expect(basketApi.get).toHaveBeenCalledTimes(2));
  });

  it("isolates wallet failure and renders empty Basket state", async () => {
    vi.mocked(walletApi.get).mockRejectedValue(new Error("wallet failed"));
    render(<BasketExperience />);
    expect(await screen.findByText(/Galaxy M47/)).toBeInTheDocument();
    expect(screen.getByText("موجودی کیف پول دریافت نشد")).toBeInTheDocument();

    vi.mocked(basketApi.get).mockResolvedValueOnce({ ...basket, items: [], total: 0, next_expiration_at: null });
    render(<BasketExperience />);
    expect(await screen.findByText("سبد خرید خالی است")).toBeInTheDocument();
  });

  it("guards Checkout and links to wallet when balance is insufficient", async () => {
    vi.mocked(walletApi.get).mockResolvedValue({ ...wallet, balance: 1 });
    render(<BasketExperience />);
    expect(await screen.findByRole("link", { name: "افزایش موجودی کیف پول" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByRole("link", { name: /ادامه برای پرداخت/ })).toHaveAttribute("aria-disabled", "true");
  });
});
