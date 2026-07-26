import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedStores } from "@/features/home/components/featured-stores";
import { HomeHero } from "@/features/home/components/home-hero";
import { TorobcheSection } from "@/features/home/components/torobche-section";
import { getHomeStores, HOME_PUBLIC_REQUEST_COUNT } from "@/features/home/data/home-data";
import { ApiClient } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://localhost:8000/api";

describe("FE006 Homepage", () => {
  it("renders one Hero heading and the approved destinations", () => {
    render(<HomeHero />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /شروع گفتگو/ })).toHaveAttribute("href", "/torobche");
    expect(screen.getByRole("link", { name: "مشاهده فروشگاه‌ها" })).toHaveAttribute(
      "href",
      "/stores",
    );
  });

  it("gives Torobche a dedicated, non-fake interaction section", () => {
    render(<TorobcheSection />);
    expect(screen.getByRole("heading", { name: /از Torobche/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /شروع گفتگو/ })).toHaveAttribute("href", "/torobche");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders public Store identity without private fields", () => {
    render(
      <FeaturedStores
        state={{
          status: "ready",
          stores: [{ id: 7, name: "فروشگاه سپهر", slug: "sepehr", logo: null }],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /فروشگاه سپهر/ })).toHaveAttribute("href", "/stores/7");
    expect(screen.queryByText(/business_phone|business_email|address|reviewed_by/i)).toBeNull();
  });

  it("renders honest empty and partial-error Store states", () => {
    const { rerender } = render(<FeaturedStores state={{ status: "empty", stores: [] }} />);
    expect(screen.getByText(/هنوز فروشگاه عمومی فعالی/)).toBeVisible();
    rerender(<FeaturedStores state={{ status: "error", stores: [] }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/قابل دریافت نیستند/);
  });

  it("loads Stores with one bounded public request", async () => {
    let requestCount = 0;
    apiMockServer.use(
      http.get(`${baseUrl}/stores/`, ({ request }) => {
        requestCount += 1;
        expect(new URL(request.url).searchParams.get("page_size")).toBe("6");
        return HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: "فروشگاه یک", slug: "one", logo: null }],
        });
      }),
    );
    const state = await getHomeStores(new ApiClient({ baseUrl }));
    expect(HOME_PUBLIC_REQUEST_COUNT).toBe(1);
    expect(requestCount).toBe(1);
    expect(state.status).toBe("ready");
  });

  it("degrades to a section error for malformed public data", async () => {
    apiMockServer.use(
      http.get(`${baseUrl}/stores/`, () =>
        HttpResponse.json({ count: 1, next: null, previous: null, results: [{ owner: 9 }] }),
      ),
    );
    await expect(getHomeStores(new ApiClient({ baseUrl }))).resolves.toEqual({
      status: "error",
      stores: [],
    });
  });
});
