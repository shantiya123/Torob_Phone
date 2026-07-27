import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderDetailExperience } from "@/features/orders/components/order-detail-experience";
import { ordersApi } from "@/lib/api/orders";

vi.mock("next/navigation", () => ({ useParams: () => ({ orderId: "8" }) }));
vi.mock("@/lib/api/orders", () => ({ ordersApi: { detail: vi.fn(), cancel: vi.fn() } }));

const order = { id: 8, status: "paid", store: { id: 1, name: "Mobile Center" }, item_count: 1, total: 35000000, created_at: "2026-07-27T10:00:00Z", updated_at: "2026-07-27T10:00:00Z", items: [{ id: 4, offer: 7, variant: { id: 31, brand: "Samsung", model: "Galaxy M47", image_url: null, ram_gb: 8, storage_gb: 128, storage_technology: "UFS" }, quantity: 1, unit_price: 35000000, line_total: 35000000, created_at: "2026-07-27T10:00:00Z" }] } as const;

describe("FE015 order detail", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ordersApi.detail).mockResolvedValue(order); });
  it("loads and renders historical order values and navigation", async () => {
    render(<OrderDetailExperience />);
    expect(await screen.findByText("Galaxy M47")).toBeInTheDocument();
    expect(ordersApi.detail).toHaveBeenCalledWith(8);
    expect(screen.getByRole("link", { name: /Samsung Galaxy M47/ })).toHaveAttribute("href", "/phones/31");
    expect(screen.getByRole("link", { name: "Mobile Center" })).toHaveAttribute("href", "/stores/1");
    expect(screen.getByText("پرداخت‌شده")).toBeInTheDocument();
  });
  it("does not update status before cancellation confirmation", async () => {
    let resolveCancel!: (value: any) => void;
    vi.mocked(ordersApi.cancel).mockImplementation(() => new Promise((resolve) => { resolveCancel = resolve; }));
    render(<OrderDetailExperience />);
    await screen.findByText("پرداخت‌شده");
    fireEvent.click(screen.getByRole("button", { name: "لغو سفارش" }));
    fireEvent.click(screen.getByRole("button", { name: "تأیید لغو سفارش" }));
    expect(screen.getByText("پرداخت‌شده")).toBeInTheDocument();
    resolveCancel({ order: { ...order, status: "cancelled" }, stock_restored: true, refund: { id: 2, amount: 35000000, balance_after: 50000000, transaction_type: "refund", order: 8, created_at: "2026-07-27T10:01:00Z" }, refund_created: true, wallet_balance: 50000000 });
    expect(await screen.findByText("لغوشده")).toBeInTheDocument();
  });
  it("blocks duplicate cancellation submission", async () => {
    vi.mocked(ordersApi.cancel).mockImplementation(() => new Promise(() => {}));
    render(<OrderDetailExperience />);
    await screen.findByText("پرداخت‌شده");
    fireEvent.click(screen.getByRole("button", { name: "لغو سفارش" }));
    const confirm = screen.getByRole("button", { name: "تأیید لغو سفارش" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    await waitFor(() => expect(ordersApi.cancel).toHaveBeenCalledTimes(1));
    expect(ordersApi.cancel).toHaveBeenCalledWith(8);
  });
});
