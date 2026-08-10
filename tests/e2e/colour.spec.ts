import { expect, test, type Page } from '@playwright/test';

/**
 * Colour, and the legibility it has to preserve. The greyscale check is the one
 * that matters: it is what catches a palette that reads well only because of
 * hue (SC-006).
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);
const mode = (page: Page, m: string) => page.locator(`[data-mode="${m}"]`);

async function firstEmpty(page: Page): Promise<number> {
  const cells = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes.map((node, i) => (node.querySelector('.value') ? -1 : i)).filter((i) => i >= 0),
    );
  const first = cells[0];
  if (first === undefined) throw new Error('the puzzle has no empty cell');
  return first;
}

test('the pad shows nine swatches in colour mode and keeps its shape (FR-034)', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.getByTestId('keys').boundingBox();
  await expect(page.locator('.key')).toHaveCount(9);

  await mode(page, 'colour').click();
  await expect(page.locator('.key.swatch')).toHaveCount(9);

  // The same nine keys, wearing colours — the pad does not resize when the mode
  // changes (003 FR-053).
  const after = await page.getByTestId('keys').boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 0);
  expect(after!.height).toBeCloseTo(before!.height, 0);
});

test('digits place colours, so colour mode is operable from the keyboard (FR-051)', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await page.keyboard.press('v');
  await page.keyboard.press('4');

  await expect(cell(page, target)).toHaveClass(/coloured/);
  await expect(cell(page, target)).toHaveAttribute('data-cell', String(target));
});

test('applying a colour, and applying it again to remove it (FR-033)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'colour').click();
  await page.locator('[data-swatch="l3"]').click();
  await expect(cell(page, target)).toHaveClass(/coloured/);

  await page.locator('[data-swatch="l3"]').click();
  await expect(cell(page, target)).not.toHaveClass(/coloured/);
});

test('the palette control reaches the second nine (FR-034, FR-042)', async ({ page }) => {
  await page.goto('./');
  await mode(page, 'colour').click();

  await expect(page.getByTestId('palette')).toBeVisible();
  await expect(page.getByTestId('palette')).toBeEnabled();
  await expect(page.locator('[data-swatch="l1"]')).toBeVisible();

  await page.getByTestId('palette').click();
  await expect(page.locator('[data-swatch="d1"]')).toBeVisible();
  await expect(page.locator('[data-swatch="l1"]')).toHaveCount(0);
});

test('a colour applies to a cell that came with the puzzle', async ({ page }) => {
  await page.goto('./');
  const given = page.locator('.cell.given').first();

  await given.click();
  await mode(page, 'colour').click();
  await page.locator('[data-swatch="l6"]').click();

  // Colour annotates the cell rather than what is written in it, so unlike
  // marks it is allowed on givens (contracts/annotations.md).
  await expect(given).toHaveClass(/coloured/);
});

test('a value, a centre mark, and a corner mark stay readable on a colour in greyscale (SC-006)', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  await page.locator('[data-key="2"]').click();
  await mode(page, 'corner').click();
  await page.locator('[data-key="8"]').click();
  await mode(page, 'colour').click();
  await page.locator('[data-swatch="l1"]').click();

  await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });

  // Compare the coloured cell against the same cell with the colour removed. If
  // hue were carrying the contrast, these would be indistinguishable once the
  // colour is gone from both.
  const coloured = await cell(page, target).screenshot();
  await page.locator('[data-swatch="l1"]').click();
  await expect(cell(page, target)).not.toHaveClass(/coloured/);
  const plain = await cell(page, target).screenshot();

  expect(
    coloured.equals(plain),
    'in greyscale a coloured cell is identical to an uncoloured one',
  ).toBe(false);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test(`colours stay distinguishable from the grid (SC-009)`, async ({ page }) => {
      await page.goto('./');
      const target = await firstEmpty(page);
      const neighbour = target + 1;

      await cell(page, target).click();
      await mode(page, 'colour').click();
      await page.locator('[data-swatch="l9"]').click();

      const painted = await cell(page, target).evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      const bare = await cell(page, neighbour).evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      expect(painted, `a coloured cell matches the grid in the ${scheme} theme`).not.toBe(bare);
    });
  });
}
