import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderHistoryExperience } from "@/features/orders/components/order-history-experience";
import { ordersApi } from "@/lib/api/orders";

let pageValue: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "page" ? pageValue : null) }),
  usePathname: () => "/orders",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/api/orders", () => ({
  ordersApi: { list: vi.fn(), checkout: vi.fn() },
}));

const firstPage = {
  count: 21,
  next: "http://api.test/api/orders/?page=2",
  previous: null,
  results: [
    {
      id: 9,
      status: "paid" as const,
      store: { id: 2, name: "Digital House" },
      item_count: 2,
      total: 20_000_000,
      created_at: "2026-07-27T12:05:00Z",
      updated_at: "2026-07-27T12:06:00Z",
    },
    {
      id: 8,
      status: "completed" as const,
      store: { id: 1, name: "Mobile Center" },
      item_count: 1,
      total: 35_000_000,
      created_at: "2026-07-27T12:00:00Z",
      updated_at: "2026-07-27T12:01:00Z",
    },
  ],
};

beforeEach(() => {
  pageValue = null;
  vi.mocked(ordersApi.list).mockReset();
  vi.mocked(ordersApi.checkout).mockReset();
});

describe("FE014 Customer Order History", () => {
  it("retrieves and renders independent Store Orders in backend order", async () => {
    vi.mocked(ordersApi.list).mockResolvedValue(firstPage);
    render(<OrderHistoryExperience />);

    expect(await screen.findByRole("heading", { name: "سفارش‌های من" })).toBeInTheDocument();
    expect(ordersApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Digital House");
    expect(cards[1]).toHaveTextContent("Mobile Center");
    expect(screen.getByText("پرداخت‌شده")).toBeInTheDocument();
    expect(screen.getByText("تکمیل‌شده")).toBeInTheDocument();
    expect(screen.getByText(/۲۰٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /سفارش ۹ از فروشگاه Digital House/ })).toHaveAttribute("href", "/orders/9");
    expect(screen.getByRole("link", { name: "Digital House" })).toHaveAttribute("href", "/stores/2");
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  it("uses safe page query pagination and disables impossible controls", async () => {
    vi.mocked(ordersApi.list).mockResolvedValue(firstPage);
    render(<OrderHistoryExperience />);
    expect(await screen.findByRole("navigation", { name: "صفحه‌بندی سفارش‌ها" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "صفحه بعدی سفارش‌ها" })).toHaveAttribute("href", "/orders?page=2");
    expect(screen.queryByRole("link", { name: "صفحه قبلی سفارش‌ها" })).not.toBeInTheDocument();
  });

  it("normalizes an invalid page to page one", async () => {
    pageValue = "-3";
    vi.mocked(ordersApi.list).mockResolvedValue({ ...firstPage, count: 2, next: null });
    render(<OrderHistoryExperience />);
    await screen.findByText("Digital House");
    expect(ordersApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("renders empty history without fabricating Orders", async () => {
    vi.mocked(ordersApi.list).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<OrderHistoryExperience />);
    expect(await screen.findByRole("heading", { name: "هنوز سفارشی ثبت نکرده‌اید" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "جست‌وجوی گوشی" })).toHaveAttribute("href", "/torobche");
  });

  it("retries with a fresh list request after failure", async () => {
    vi.mocked(ordersApi.list)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    render(<OrderHistoryExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "تلاش دوباره" }));
    expect(await screen.findByRole("heading", { name: "هنوز سفارشی ثبت نکرده‌اید" })).toBeInTheDocument();
    expect(ordersApi.list).toHaveBeenCalledTimes(2);
  });

  it("shows out-of-range recovery and never reads Checkout handoff", async () => {
    pageValue = "8";
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");
    vi.mocked(ordersApi.list).mockResolvedValue({ count: 21, next: null, previous: "http://api.test/api/orders/?page=7", results: [] });
    render(<OrderHistoryExperience />);
    expect(await screen.findByRole("heading", { name: "این صفحه از سفارش‌ها وجود ندارد" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "بازگشت به صفحه اول" })).toHaveAttribute("href", "/orders");
    expect(storageSpy).not.toHaveBeenCalled();
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });
});
