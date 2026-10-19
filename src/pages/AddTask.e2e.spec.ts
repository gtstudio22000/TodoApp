import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 1280, height: 800 },
];

test.describe("Recurrence options panel stacks vertically on narrow viewports", () => {
  for (const viewport of VIEWPORTS) {
    test(`Add Task page has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/add");
      await page.getByRole("checkbox", { name: "Recurring task" }).click();
      await expect(page.getByRole("combobox", { name: /frequency/i })).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      const nameField = await page.getByPlaceholder("Enter task name").boundingBox();
      const frequency = await page.getByRole("combobox", { name: /frequency/i }).boundingBox();
      expect(frequency?.width).toBeCloseTo(nameField?.width ?? 0, 0);
    });
  }
});
