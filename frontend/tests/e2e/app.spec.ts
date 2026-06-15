import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects to sign-in from root", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("shows sign-in page with TaskFlow branding", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("text=TaskFlow")).toBeVisible();
    await expect(page.locator("text=Sign in to continue")).toBeVisible();
  });

  test("shows sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("text=TaskFlow")).toBeVisible();
    await expect(page.locator("text=Create your account")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth - in real E2E tests, use Clerk test tokens
    await page.goto("/dashboard");
  });

  test("shows dashboard stats cards", async ({ page }) => {
    // Wait for stats to load
    await expect(page.locator("text=Total Tasks")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Completed Today")).toBeVisible();
    await expect(page.locator("text=Due Today")).toBeVisible();
    await expect(page.locator("text=Overdue")).toBeVisible();
  });

  test("shows navigation sidebar", async ({ page }) => {
    await expect(page.locator("text=TaskFlow")).toBeVisible();
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=Tasks")).toBeVisible();
  });

  test("opens command palette with Cmd+K", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.locator("[data-testid='command-palette']")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Task Management", () => {
  test("shows task list page", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.locator("text=Tasks")).toBeVisible();
    await expect(page.locator("text=New task")).toBeVisible();
  });

  test("opens new task form", async ({ page }) => {
    await page.goto("/tasks/new");
    await expect(page.locator("text=Create Task")).toBeVisible();
    await expect(page.getByPlaceholder("Task title")).toBeVisible();
  });

  test("shows task filters", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page.locator("text=Status")).toBeVisible();
    await expect(page.locator("text=Priority")).toBeVisible();
  });

  test("can create a new task", async ({ page }) => {
    await page.goto("/tasks/new");
    await page.getByPlaceholder("Task title").fill("E2E Test Task");
    await page.getByPlaceholder("Add a description...").fill("This is a test task");
    await page.getByText("Create task").click();
    // Should redirect to tasks list
    await expect(page).toHaveURL(/\/tasks/, { timeout: 5000 });
  });
});

test.describe("Kanban Board", () => {
  test("shows kanban columns", async ({ page }) => {
    await page.goto("/tasks/kanban");
    await expect(page.locator("text=To Do")).toBeVisible();
    await expect(page.locator("text=In Progress")).toBeVisible();
    await expect(page.locator("text=Done")).toBeVisible();
  });
});

test.describe("Calendar View", () => {
  test("shows calendar grid", async ({ page }) => {
    await page.goto("/tasks/calendar");
    await expect(page.locator("text=Sun")).toBeVisible();
    await expect(page.locator("text=Mon")).toBeVisible();
  });

  test("can navigate months", async ({ page }) => {
    await page.goto("/tasks/calendar");
    const nextButton = page.locator("button").filter({ has: page.locator("svg") }).last();
    await nextButton.click();
  });
});

test.describe("Labels", () => {
  test("shows labels page", async ({ page }) => {
    await page.goto("/labels");
    await expect(page.locator("text=Labels")).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("shows settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Appearance")).toBeVisible();
  });

  test("shows theme options", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Light")).toBeVisible();
    await expect(page.locator("text=Dark")).toBeVisible();
    await expect(page.locator("text=System")).toBeVisible();
  });
});
