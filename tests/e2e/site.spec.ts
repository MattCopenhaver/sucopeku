import { expect, test } from '@playwright/test';

/**
 * What the deployed site must do regardless of which feature owns the page.
 *
 * Replaces the placeholder tests from feature 001. FR-028 required a page with
 * no gameplay and was withdrawn when feature 002 superseded it; FR-029 survived
 * with its scope widened, because being readable at phone width was never a
 * property of the placeholder.
 */

test('the site loads', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();
});

test('the site fits a narrow phone screen without sideways scrolling (FR-029)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');
  await expect(page.getByTestId('grid')).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows, 'page scrolls horizontally at 320px wide').toBe(false);
});
