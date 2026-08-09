import { expect, test } from '@playwright/test';

// Every test here is an action a person could perform at the site, per
// constitution Principle VIII. Nothing reaches past the interface.

test('the placeholder page renders', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();
  await expect(page.getByTestId('tagline')).toBeVisible();
});

test('the page fits a narrow phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./');

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows, 'page scrolls horizontally at 320px wide').toBe(false);
});

test('the page carries no gameplay yet', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByTestId('status')).toContainText('Nothing to play yet');
});
