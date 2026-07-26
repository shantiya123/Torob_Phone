import { expect, test } from "@playwright/test";

test("foundation home route renders in Persian RTL", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "Torob Phone" })).toBeVisible();
  await expect(page.getByRole("link", { name: "پرش به محتوای اصلی" })).toHaveCount(1);
});
