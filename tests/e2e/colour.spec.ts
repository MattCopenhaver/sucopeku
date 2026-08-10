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

  // The colour mode control is also the palette control: choosing colour again
  // switches to the other nine (003 FR-056). There is no separate strip.
  await expect(page.getByTestId('palette')).toBeVisible();
  await expect(page.locator('[data-swatch="l1"]')).toBeVisible();
  await expect(page.locator('.palette-toggle')).toHaveCount(0);

  await page.getByTestId('palette').click();
  await expect(page.locator('[data-swatch="d1"]')).toBeVisible();
  await expect(page.locator('[data-swatch="l1"]')).toHaveCount(0);

  // And by keyboard, on the same control (003 FR-010).
  await page.keyboard.press('v');
  await expect(page.locator('[data-swatch="l1"]')).toBeVisible();
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

test('the corner mode control shows four distinct marks in the real layout (FR-054)', async ({
  page,
}) => {
  await page.goto('./');
  const pips = page.locator('[data-mode="corner"] .pip');

  await expect(pips).toHaveCount(4);
  await expect(pips).toHaveText(['1', '2', '3', '4']);

  // Same positions four real corner marks take: reading order, corners only.
  const boxes = await pips.evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect()).map((r) => [Math.round(r.x), Math.round(r.y)]),
  );
  const sorted = [...boxes].sort((a, b) => a[1]! - b[1]! || a[0]! - b[0]!);
  expect(boxes, 'the corner preview is not in reading order').toEqual(sorted);
});

test('a cell holds several colours, split radially (FR-003, FR-060)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'colour').click();
  await page.locator('[data-swatch="l6"]').click();
  await expect(cell(page, target)).toHaveClass(/coloured/);
  await expect(cell(page, target)).not.toHaveClass(/multi/);

  await page.locator('[data-swatch="l2"]').click();
  await expect(cell(page, target)).toHaveClass(/multi/);

  // Split radially, in palette order — not the order they were pressed, so the
  // first colour does not move when a second arrives (FR-060).
  const background = await cell(page, target).evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(background).toContain('conic-gradient');
  const l2 = background.indexOf('194, 121, 63');
  const l6 = background.indexOf('75, 131, 173');
  expect(l2).toBeGreaterThan(-1);
  expect(l6).toBeGreaterThan(-1);
  expect(l2, 'colours are not in palette order').toBeLessThan(l6);
});

test('removing one colour leaves the others (FR-033)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'colour').click();
  for (const id of ['l1', 'l4', 'l7']) await page.locator(`[data-swatch="${id}"]`).click();
  await expect(cell(page, target)).toHaveClass(/multi/);

  await page.locator('[data-swatch="l4"]').click();
  const background = await cell(page, target).evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(background, 'the removed colour is still shown').not.toContain('91, 145, 99');
  await expect(cell(page, target)).toHaveClass(/coloured/);

  for (const id of ['l1', 'l7']) await page.locator(`[data-swatch="${id}"]`).click();
  await expect(cell(page, target)).not.toHaveClass(/coloured/);
});

test('digits stay legible on a cell split between several colours (FR-032, FR-061)', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await page.locator('[data-key="7"]').click();
  await mode(page, 'colour').click();
  for (const id of ['l1', 'l6']) await page.locator(`[data-swatch="${id}"]`).click();

  // The second nine are behind the same control — choosing colour again
  // switches palette (FR-056), so a cell can mix colours from both.
  await page.getByTestId('palette').click();
  for (const id of ['d3', 'd8']) await page.locator(`[data-swatch="${id}"]`).click();

  // Every digit carries a halo, so no background can swallow it (FR-061).
  const shadow = await cell(page, target)
    .locator('.value')
    .evaluate((node) => getComputedStyle(node).textShadow);
  expect(shadow, 'the value has no halo to read against the colours').not.toBe('none');

  await expect(cell(page, target).locator('.value')).toHaveText('7');
  await expect(cell(page, target)).toHaveClass(/multi/);
});
