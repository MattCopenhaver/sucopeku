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

test('pad content fills its buttons at every window size', async ({ page }) => {
  // A regression guard with teeth. The pad's text was once sized from a token
  // holding a percentage, which a font-size reads as a share of the parent font
  // rather than of the width: it computed under a pixel and the pad rendered
  // blank. A ratio check catches that class of mistake, which "it built and the
  // tests passed" does not.
  for (const size of [
    { width: 1600, height: 1200 },
    { width: 900, height: 800 },
    { width: 375, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('./');

    const digit = page.locator('[data-key="5"]');
    const box = (await digit.boundingBox())!;
    const fontPx = await digit.evaluate((n) => parseFloat(getComputedStyle(n).fontSize));

    expect(fontPx, `digit unreadably small at ${size.width}px`).toBeGreaterThan(9);
    expect(fontPx / box.height, `digit too small for its key at ${size.width}px`).toBeGreaterThan(
      0.3,
    );
    expect(fontPx / box.height, `digit overflows its key at ${size.width}px`).toBeLessThan(0.95);

    const wheel = page.locator('.preview-colour');
    const wheelBox = (await wheel.boundingBox())!;
    expect(wheelBox.width, `colour wheel invisible at ${size.width}px`).toBeGreaterThan(12);
  }
});

test('the theme control still works when storage is refused (EC-008, EC-011)', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = (): never => {
      throw new DOMException('denied', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({ getItem: deny, setItem: deny, removeItem: deny, clear: deny }),
    });
  });

  await page.goto('./');
  await expect(page.getByTestId('grid')).toBeVisible();

  // The theme lives under its own key with its own write path, so feature 002's
  // storage handling says nothing about it. It must apply for the session even
  // though the choice cannot be remembered.
  const control = page.getByTestId('theme');
  await control.click();
  await expect(control).toHaveText('Theme: Light');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'light',
  );

  await control.click();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'dark',
  );
});

test('annotation keeps working when storage is refused (FR-038, EC-008)', async ({ page }) => {
  await page.addInitScript(() => {
    const deny = (): never => {
      throw new DOMException('denied', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({ getItem: deny, setItem: deny, removeItem: deny, clear: deny }),
    });
  });

  await page.goto('./');
  const empty = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes.map((n, i) => (n.querySelector('.value') ? -1 : i)).filter((i) => i >= 0),
    );
  const target = empty[0]!;

  await page.locator(`[data-cell="${target}"]`).click();
  await page.locator('[data-mode="centre"]').click();
  await page.locator('[data-key="4"]').click();
  await expect(page.locator(`[data-cell="${target}"] .centre`)).toHaveText('4');

  await page.locator('[data-mode="colour"]').click();
  await page.locator('[data-swatch="l2"]').click();
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveClass(/coloured/);
});

test('a full storage quota does not stop play (EC-008)', async ({ page }) => {
  // Denial and exhaustion are different failures that reach the same catch.
  // Annotations make a puzzle's record several times larger, so exhaustion is
  // far more reachable than it was — worth its own test rather than assuming
  // the denial one covers it.
  await page.addInitScript(() => {
    const real = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({
        getItem: (k: string) => real.getItem(k),
        removeItem: (k: string) => real.removeItem(k),
        clear: () => real.clear(),
        setItem: () => {
          throw new DOMException('exceeded', 'QuotaExceededError');
        },
      }),
    });
  });

  await page.goto('./');
  const empty = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes.map((n, i) => (n.querySelector('.value') ? -1 : i)).filter((i) => i >= 0),
    );
  const target = empty[0]!;

  await page.locator(`[data-cell="${target}"]`).click();
  await page.locator('[data-key="5"]').click();
  await expect(page.locator(`[data-cell="${target}"] .value`)).toHaveText('5');
  await expect(page.getByTestId('grid')).toBeVisible();
});
