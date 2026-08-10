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

test('the theme control cycles all three positions and the choice holds (FR-045 to FR-047)', async ({
  page,
}) => {
  await page.goto('./');
  const control = page.getByTestId('theme');
  const attr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  // Nothing chosen yet: the device setting applies and nothing is stored.
  await expect(control).toHaveText('Theme: Auto');
  expect(await attr()).toBeNull();

  await control.click();
  await expect(control).toHaveText('Theme: Light');
  expect(await attr()).toBe('light');

  await control.click();
  await expect(control).toHaveText('Theme: Dark');
  expect(await attr()).toBe('dark');

  await page.reload();
  expect(await attr()).toBe('dark');
  await expect(page.getByTestId('theme')).toHaveText('Theme: Dark');

  // Back to following the device, with nothing left stored (FR-045).
  await page.getByTestId('theme').click();
  await expect(page.getByTestId('theme')).toHaveText('Theme: Auto');
  expect(await attr()).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('sucopeku.theme'))).toBeNull();
});

test('a theme chosen in one tab appears in the other (FR-050)', async ({ page, context }) => {
  await page.goto('./');
  const other = await context.newPage();
  await other.goto('./');

  await other.getByTestId('theme').click();
  await other.getByTestId('theme').click();

  // No reload in the first tab.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe('dark');
  await other.close();
});

test('an unreadable stored theme falls back to the device (EC-011)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sucopeku.theme', 'chartreuse'));
  await page.goto('./');

  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('the board scales with the window rather than sitting fixed (FR-055)', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto('./');
  const large = (await page.getByTestId('grid').boundingBox())!.width;

  await page.setViewportSize({ width: 900, height: 700 });
  const small = (await page.getByTestId('grid').boundingBox())!.width;

  expect(large, 'the board did not grow on a larger window').toBeGreaterThan(small);
  // And it never outgrows the window (002 FR-029 still holds).
  expect(large).toBeLessThanOrEqual(1600 * 0.92);
});

test('the board and the heading are centred in the window', async ({ page }) => {
  for (const size of [
    { width: 1600, height: 1200 },
    { width: 1024, height: 768 },
    { width: 375, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('./');

    const grid = (await page.getByTestId('grid').boundingBox())!;
    const heading = (await page.getByRole('heading', { name: 'Sucopeku' }).boundingBox())!;

    // Against the client width, not the viewport: a vertical scrollbar takes
    // real estate the layout centres inside, so comparing to the window would
    // report the board as off-centre by half a scrollbar when it is not.
    const usable = await page.evaluate(() => document.documentElement.clientWidth);
    const gridCentre = grid.x + grid.width / 2;
    const headingCentre = heading.x + heading.width / 2;

    expect(Math.abs(gridCentre - usable / 2), `board off centre at ${size.width}px`).toBeLessThan(
      2,
    );
    expect(
      Math.abs(headingCentre - gridCentre),
      `heading not over the board at ${size.width}px`,
    ).toBeLessThan(2);

    // And it never overflows the space it is centred in.
    expect(grid.x).toBeGreaterThanOrEqual(0);
    expect(grid.x + grid.width).toBeLessThanOrEqual(usable);
  }
});
