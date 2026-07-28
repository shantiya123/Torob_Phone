import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletExperience } from "@/features/wallet/components/wallet-experience";
import { getWalletTransactionLabel } from "@/features/wallet/lib/wallet-transaction";
import { walletApi } from "@/lib/api/wallet";

let pageValue: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "page" ? pageValue : null) }),
  usePathname: () => "/wallet",
}));

vi.mock("@/lib/api/wallet", () => ({
  walletApi: { get: vi.fn(), transactions: vi.fn(), charge: vi.fn() },
}));

const wallet = {
  id: 1,
  balance: 8_000_000,
  created_at: "2026-07-27T10:00:00Z",
  updated_at: "2026-07-27T12:00:00Z",
};
const transactions = {
  count: 2,
  next: null,
  previous: null,
  results: [
    { id: 3, amount: 3_000_000, balance_after: 8_000_000, transaction_type: "refund" as const, order: 9, created_at: "2026-07-27T12:00:00Z" },
    { id: 2, amount: -2_000_000, balance_after: 5_000_000, transaction_type: "purchase" as const, order: 8, created_at: "2026-07-27T11:00:00Z" },
  ],
};

beforeEach(() => {
  pageValue = null;
  vi.mocked(walletApi.get).mockReset().mockResolvedValue(wallet);
  vi.mocked(walletApi.transactions).mockReset().mockResolvedValue(transactions);
  vi.mocked(walletApi.charge).mockReset();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "wallet-attempt-1") });
});

describe("FE016 Customer Wallet", () => {
  it("loads authoritative balance and keeps backend transaction order", async () => {
    render(<WalletExperience />);
    expect(await screen.findByRole("heading", { name: "کیف پول" })).toBeInTheDocument();
    expect(walletApi.get).toHaveBeenCalledTimes(1);
    expect(walletApi.transactions).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(screen.getByText(/۸٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("بازگشت وجه سفارش");
    expect(rows[1]).toHaveTextContent("پرداخت سفارش");
    expect(screen.getByRole("link", { name: "مشاهده سفارش 9" })).toHaveAttribute("href", "/orders/9");
  });

  it("preserves balance when transaction history fails and retries history independently", async () => {
    vi.mocked(walletApi.transactions).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    render(<WalletExperience />);
    expect(await screen.findByText(/۸٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "تلاش دوباره" }));
    expect(await screen.findByRole("heading", { name: "هنوز تراکنشی ثبت نشده است" })).toBeInTheDocument();
    expect(walletApi.transactions).toHaveBeenCalledTimes(2);
    expect(walletApi.get).toHaveBeenCalledTimes(1);
  });

  it("normalizes malformed pages and exposes backend pagination links", async () => {
    pageValue = "-4";
    vi.mocked(walletApi.transactions).mockResolvedValue({ ...transactions, count: 21, next: "http://api.test/api/wallet/transactions/?page=2" });
    render(<WalletExperience />);
    await screen.findByText("بازگشت وجه سفارش");
    expect(walletApi.transactions).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(screen.getByRole("link", { name: "صفحه بعدی تراکنش‌ها" })).toHaveAttribute("href", "/wallet?page=2");
  });

  it("submits exact idempotent charge without optimistic balance mutation", async () => {
    let resolveCharge!: (value: Awaited<ReturnType<typeof walletApi.charge>>) => void;
    vi.mocked(walletApi.charge).mockReturnValue(new Promise((resolve) => { resolveCharge = resolve; }));
    render(<WalletExperience />);
    await screen.findByText(/۸٬۰۰۰٬۰۰۰ تومان/);
    fireEvent.click(screen.getByRole("button", { name: "ادامه افزایش موجودی" }));
    fireEvent.click(screen.getByRole("button", { name: "تأیید افزایش موجودی" }));
    expect(walletApi.charge).toHaveBeenCalledWith(1_000_000, "wallet-attempt-1");
    expect(screen.getByText(/۸٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    resolveCharge({
      wallet: { ...wallet, balance: 9_000_000 },
      transaction: { id: 4, amount: 1_000_000, balance_after: 9_000_000, transaction_type: "charge", order: null, created_at: "2026-07-27T13:00:00Z" },
    });
    expect(await screen.findByText(/۹٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
    expect(walletApi.transactions).toHaveBeenCalledTimes(2);
  });

  it("blocks rapid duplicate top-up submission", async () => {
    vi.mocked(walletApi.charge).mockImplementation(() => new Promise(() => undefined));
    render(<WalletExperience />);
    await screen.findByText(/۸٬۰۰۰٬۰۰۰ تومان/);
    fireEvent.click(screen.getByRole("button", { name: "ادامه افزایش موجودی" }));
    const confirm = screen.getByRole("button", { name: "تأیید افزایش موجودی" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(walletApi.charge).toHaveBeenCalledTimes(1);
  });

  it("does not invent an Order relation and maps unknown kinds safely", async () => {
    vi.mocked(walletApi.transactions).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 1, amount: 1_000_000, balance_after: 1_000_000, transaction_type: "charge", order: null, created_at: "2026-07-27T10:00:00Z" }] });
    render(<WalletExperience />);
    expect(await screen.findByText("بدون سفارش مرتبط")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /مشاهده سفارش/ })).not.toBeInTheDocument();
    expect(getWalletTransactionLabel("future_kind")).toBe("تراکنش نامشخص");
  });
});
