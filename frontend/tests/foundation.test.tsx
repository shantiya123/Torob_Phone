import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationPlaceholder } from "@/components/foundation/foundation-placeholder";
import { isolateBidi } from "@/lib/rtl";

describe("FE001 foundation", () => {
  it("renders the foundation placeholder without feature content", () => {
    render(<FoundationPlaceholder />);

    expect(screen.getByRole("heading", { name: "Torob Phone" })).toBeVisible();
    expect(screen.getByText(/صفحات محصول/)).toBeVisible();
  });

  it("isolates mixed-direction values", () => {
    expect(isolateBidi("Galaxy M47")).toBe("\u2068Galaxy M47\u2069");
  });
});
