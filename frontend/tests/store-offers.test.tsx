import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreOffersExperience } from "@/features/store-offers/components/store-offers-experience";
import { offersApi } from "@/lib/api/offers";

let query: Record<string, string | null> = {};
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => query[key] ?? null }),
  usePathname: () => "/store/offers",
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}));

vi.mock("@/lib/api/offers", () => ({
  offersApi: { mine: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const offers = {
  count: 21,
  next: "http://api.test/api/stores/me/offers/?page=2",
  previous: null,
  results: [
    {
      id: 11,
      device_variant: { id: 31, brand: "Samsung", model_name: "Galaxy M47", device_kind: "smartphone", image_url: null, storage_gb: 256, ram_gb: 8, storage_technology: "UFS", is_available: true },
      store: { id: 1, name: "Mobile Center", slug: "mobile-center", logo: null },
      price: 35_000_000,
      quantity: 4,
      publicly_available: true,
      availability_reason: null,
      updated_at: "2026-07-27T12:00:00Z",
    },
    {
      id: 10,
      device_variant: { id: 30, brand: "Samsung", model_name: "Galaxy M47", device_kind: "smartphone", image_url: null, storage_gb: 128, ram_gb: 8, storage_technology: "UFS", is_available: true },
      store: { id: 1, name: "Mobile Center", slug: "mobile-center", logo: null },
      price: 35_000_000,
      quantity: 0,
      publicly_available: false,
      availability_reason: "out_of_stock" as const,
      updated_at: "2026-07-27T11:00:00Z",
    },
  ],
};

beforeEach(() => {
  query = {};
  vi.mocked(offersApi.mine).mockReset();
});

describe("FE017 Store Offer Management Index", () => {
  it("loads only the Store-owned API and preserves backend ordering", async () => {
    vi.mocked(offersApi.mine).mockResolvedValue(offers);
    render(<StoreOffersExperience />);

    expect(await screen.findByRole("heading", { name: "پیشنهادهای من" })).toBeInTheDocument();
    expect(offersApi.mine).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("۲۵۶ گیگابایت");
    expect(cards[1]).toHaveTextContent("۱۲۸ گیگابایت");
    expect(screen.getAllByText(/۳۵٬۰۰۰٬۰۰۰ تومان/)).toHaveLength(2);
    expect(screen.getByText("۴ عدد")).toBeInTheDocument();
    expect(screen.getByText("موجودی تمام شده است")).toBeInTheDocument();
  });

  it("keeps exact variant, phone, edit and create destinations", async () => {
    vi.mocked(offersApi.mine).mockResolvedValue({ ...offers, count: 2, next: null });
    render(<StoreOffersExperience />);
    expect((await screen.findAllByRole("link", { name: "Samsung Galaxy M47" }))[0]).toHaveAttribute("href", "/phones/31");
    expect(screen.getByRole("link", { name: "ویرایش پیشنهاد Samsung Galaxy M47" })).toHaveAttribute("href", "/store/offers/11/edit");
    expect(screen.getByRole("link", { name: "ایجاد پیشنهاد فروش" })).toHaveAttribute("href", "/store/offers/new");
  });

  it("passes only supported backend search, stock and pagination parameters", async () => {
    query = { page: "2", search: "Galaxy", stock: "out" };
    vi.mocked(offersApi.mine).mockResolvedValue({ count: 21, next: null, previous: "http://api.test/api/stores/me/offers/?page=1", results: [offers.results[1]] });
    render(<StoreOffersExperience />);
    await screen.findByText("موجودی تمام شده است");
    expect(offersApi.mine).toHaveBeenCalledWith({ page: 2, pageSize: 20, search: "Galaxy", stock: "out" });
    expect(screen.getByRole("link", { name: /قبلی/ })).toHaveAttribute("href", "/store/offers?search=Galaxy&stock=out");
  });

  it("normalizes malformed page values", async () => {
    query = { page: "-3" };
    vi.mocked(offersApi.mine).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<StoreOffersExperience />);
    await screen.findByRole("heading", { name: "پیشنهاد فروشی ثبت نکرده‌ای" });
    expect(offersApi.mine).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("renders empty state and creation navigation", async () => {
    vi.mocked(offersApi.mine).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<StoreOffersExperience />);
    expect(await screen.findByRole("heading", { name: "پیشنهاد فروشی ثبت نکرده‌ای" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "ایجاد پیشنهاد فروش" })[0]).toHaveAttribute("href", "/store/offers/new");
  });

  it("retries after a list failure", async () => {
    vi.mocked(offersApi.mine).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] });
    render(<StoreOffersExperience />);
    fireEvent.click(await screen.findByRole("button", { name: "تلاش دوباره" }));
    expect(await screen.findByRole("heading", { name: "پیشنهاد فروشی ثبت نکرده‌ای" })).toBeInTheDocument();
    expect(offersApi.mine).toHaveBeenCalledTimes(2);
  });

  it("does not expose unsupported inline mutation actions", async () => {
    vi.mocked(offersApi.mine).mockResolvedValue({ ...offers, count: 2, next: null });
    render(<StoreOffersExperience />);
    await screen.findByText("قابل نمایش عمومی");
    expect(screen.queryByRole("button", { name: /حذف|فعال|غیرفعال|موجودی/ })).not.toBeInTheDocument();
    expect(offersApi.update).not.toHaveBeenCalled();
    expect(offersApi.remove).not.toHaveBeenCalled();
  });
});
