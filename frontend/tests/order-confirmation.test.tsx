import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderConfirmationExperience } from "@/features/orders/components/order-confirmation-experience";
import { getOrderStatusPresentation } from "@/features/orders/lib/order-status";

let checkoutId: string | null = "12";
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "checkoutId" ? checkoutId : null) }),
}));

const result = {
  checkout_id: "12",
  orders: [
    {
      id: 8,
      status: "paid",
      store: { id: 1, name: "Mobile Center" },
      item_count: 1,
      total: 35_000_000,
      created_at: "2026-07-27T12:00:00Z",
      updated_at: "2026-07-27T12:00:00Z",
    },
    {
      id: 9,
      status: "completed",
      store: { id: 2, name: "Digital House" },
      item_count: 2,
      total: 20_000_000,
      created_at: "2026-07-27T12:05:00Z",
      updated_at: "2026-07-27T12:05:00Z",
    },
  ],
  order_count: 2,
  total: 55_000_000,
  wallet_balance: 15_000_000,
};

function store(value: unknown, key = "12") {
  sessionStorage.setItem(`torob-phone:checkout-result:${key}`, JSON.stringify(value));
}

beforeEach(() => {
  checkoutId = "12";
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("FE013 Customer Order Confirmation", () => {
  it("renders a validated multi-order handoff as separate Store Orders", async () => {
    store(result);
    render(<OrderConfirmationExperience />);

    expect(await screen.findByRole("heading", { name: "سفارش‌های شما ثبت شدند" })).toBeInTheDocument();
    expect(screen.getByText("Mobile Center")).toBeInTheDocument();
    expect(screen.getByText("Digital House")).toBeInTheDocument();
    expect(screen.getByText(/۵۵٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    expect(screen.getByText(/۱۵٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /مشاهده جزئیات سفارش/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /سفارش ۸ از فروشگاه Mobile Center/ })).toHaveAttribute("href", "/orders/8");
    expect(screen.getByRole("link", { name: /سفارش ۹ از فروشگاه Digital House/ })).toHaveAttribute("href", "/orders/9");
    expect(screen.getByRole("link", { name: "مشاهده تاریخچه سفارش‌ها" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: "ادامه جست‌وجوی گوشی" })).toHaveAttribute("href", "/torobche");
  });

  it("keeps the handoff for refresh and performs no Checkout request", async () => {
    store(result);
    const { unmount } = render(<OrderConfirmationExperience />);
    expect(await screen.findByText("Mobile Center")).toBeInTheDocument();
    unmount();
    render(<OrderConfirmationExperience />);
    expect(await screen.findByText("Digital House")).toBeInTheDocument();
    expect(sessionStorage.getItem("torob-phone:checkout-result:12")).not.toBeNull();
  });

  it("shows controlled recovery for missing or unsafe Checkout IDs", async () => {
    checkoutId = null;
    const { unmount } = render(<OrderConfirmationExperience />);
    expect(await screen.findByRole("heading", { name: "جزئیات تأیید خرید در دسترس نیست" })).toBeInTheDocument();
    expect(screen.queryByText("سفارش‌های شما ثبت شدند")).not.toBeInTheDocument();
    unmount();

    checkoutId = "../../orders";
    render(<OrderConfirmationExperience />);
    expect(await screen.findByText(/شناسه تسویه موجود در نشانی صفحه معتبر نیست/)).toBeInTheDocument();
  });

  it("rejects a missing, corrupt, private-field, or mismatched handoff", async () => {
    const cases: unknown[] = [
      null,
      "not-json",
      { ...result, secret: "private" },
      { ...result, checkout_id: "other" },
    ];

    for (const value of cases) {
      sessionStorage.clear();
      if (value === "not-json") sessionStorage.setItem("torob-phone:checkout-result:12", value);
      else if (value !== null) store(value);
      const view = render(<OrderConfirmationExperience />);
      expect(await screen.findByRole("heading", { name: "جزئیات تأیید خرید در دسترس نیست" })).toBeInTheDocument();
      expect(screen.queryByText(/۵۵٬۰۰۰٬۰۰۰ تومان/)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("recovers safely when session storage access throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    render(<OrderConfirmationExperience />);
    expect(await screen.findByRole("heading", { name: "جزئیات تأیید خرید در دسترس نیست" })).toBeInTheDocument();
  });

  it("uses safe labels for known and unknown Order statuses", () => {
    expect(getOrderStatusPresentation("paid").label).toBe("پرداخت‌شده");
    expect(getOrderStatusPresentation("completed").label).toBe("تکمیل‌شده");
    expect(getOrderStatusPresentation("future_status").label).toBe("وضعیت نامشخص");
  });
});
