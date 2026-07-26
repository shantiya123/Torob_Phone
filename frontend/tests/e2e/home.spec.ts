import { expect, test } from "@playwright/test";

test("production Homepage renders in Persian RTL and links to discovery", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /نیازت را بگو/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /شروع گفتگو با Torobche/ }).first()).toHaveAttribute(
    "href",
    "/torobche",
  );
  await expect(page.getByRole("link", { name: "مشاهده فروشگاه‌ها" }).first()).toHaveAttribute(
    "href",
    "/stores",
  );
  await expect(page.getByRole("link", { name: "پرش به محتوای اصلی" })).toHaveCount(1);
});

test("Homepage does not overflow a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
