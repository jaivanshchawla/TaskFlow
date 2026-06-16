import { test, expect } from "@playwright/test";

test.describe("App", () => {
  test("redirects to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("sign-up page renders correctly", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("text=Create account")).toBeVisible();
  });
});
