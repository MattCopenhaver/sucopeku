import { expect, test, type Page } from '@playwright/test';

/**
 * Pencil marks, reached only through the grid and the pad. The annotation
 * registry has no other entry a player could use, so it has no other entry a
 * test may use either (Principle VIII).
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);
const key = (page: Page, k: string) => page.locator(`[data-key="${k}"]`);
const mode = (page: Page, m: string) => page.locator(`[data-mode="${m}"]`);

async function emptyCells(page: Page): Promise<number[]> {
  return page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes
        .map((node, index) => (node.querySelector('.value') ? -1 : index))
        .filter((index) => index >= 0),
    );
}

async function firstEmpty(page: Page): Promise<number> {
  const first = (await emptyCells(page))[0];
  if (first === undefined) throw new Error('the puzzle has no empty cell');
  return first;
}

test('centre marks are recorded and removed, and the cell stays empty', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  await expect(mode(page, 'centre')).toHaveAttribute('aria-pressed', 'true');

  for (const digit of ['1', '4', '7']) await key(page, digit).click();
  await expect(cell(page, target).locator('.centre')).toHaveText('147');

  // Pressing an existing mark removes it (FR-022).
  await key(page, '4').click();
  await expect(cell(page, target).locator('.centre')).toHaveText('17');

  // A marked cell is still empty as far as the game is concerned (FR-005).
  await expect(cell(page, target)).not.toHaveClass(/conflict/);
  await expect(page.getByTestId('status')).toHaveText('');
});

test('a value hides marks without deleting them, and erasing brings them back', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  for (const digit of ['2', '5']) await key(page, digit).click();
  await expect(cell(page, target).locator('.centre')).toHaveText('25');

  await mode(page, 'value').click();
  await key(page, '9').click();
  await expect(cell(page, target).locator('.value')).toHaveText('9');
  await expect(cell(page, target).locator('.centre')).toHaveCount(0);

  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.centre')).toHaveText('25');
});

test('marks survive a reload (SC-004)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  for (const digit of ['3', '8']) await key(page, digit).click();

  await page.reload();
  await expect(cell(page, target).locator('.centre')).toHaveText('38');
});

test('a mark placed while a value is showing is recorded underneath (EC-007)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await key(page, '6').click();
  await expect(cell(page, target).locator('.value')).toHaveText('6');

  await mode(page, 'centre').click();
  await key(page, '1').click();
  await expect(cell(page, target).locator('.centre')).toHaveCount(0);

  await mode(page, 'value').click();
  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.centre')).toHaveText('1');
});

test('cells that came with the puzzle take no marks (FR-006)', async ({ page }) => {
  await page.goto('./');
  const given = page.locator('.cell.given').first();

  await given.click();
  await mode(page, 'centre').click();
  await key(page, '5').click();

  await expect(given.locator('.centre')).toHaveCount(0);
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('every mode is reachable by pointer and by keyboard alike (FR-010, SC-003)', async ({
  page,
}) => {
  await page.goto('./');

  for (const m of ['centre', 'corner', 'colour', 'value']) {
    await mode(page, m).click();
    await expect(mode(page, m)).toHaveAttribute('aria-pressed', 'true');
  }

  for (const [k, m] of [
    ['x', 'centre'],
    ['c', 'corner'],
    ['v', 'colour'],
    ['z', 'value'],
  ] as const) {
    await page.keyboard.press(k);
    await expect(mode(page, m)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('a solved puzzle refuses annotations and does not lose them (FR-039, FR-040)', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  await key(page, '2').click();
  await expect(cell(page, target).locator('.centre')).toHaveText('2');

  const { solutionFor, solveByClicking } = await import('./solve.js');
  await mode(page, 'value').click();
  const solution = await solutionFor(page);
  await solveByClicking(page, solution);
  await expect(page.getByTestId('status')).toHaveText('Solved');

  // Locked: no annotation lands.
  await cell(page, target).click();
  await mode(page, 'centre').click();
  await key(page, '5').click();

  // Unlock, clear the value, and the original mark is still underneath.
  await mode(page, 'value').click();
  await page.getByTestId('unlock').click();
  await cell(page, target).click();
  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.centre')).toHaveText('2');
});

test('corner marks appear at the edges across a selection (US3)', async ({ page }) => {
  await page.goto('./');
  const cells = (await emptyCells(page)).slice(0, 3);

  await cell(page, cells[0]!).click();
  for (const c of cells.slice(1)) await cell(page, c).click({ modifiers: ['ControlOrMeta'] });

  await mode(page, 'corner').click();
  await key(page, '5').click();
  for (const c of cells) await expect(cell(page, c).locator('.corner')).toContainText('5');
});

test('centre and corner marks coexist without obscuring each other (US3 scenario 2)', async ({
  page,
}) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'centre').click();
  for (const d of ['1', '2', '3']) await key(page, d).click();
  await mode(page, 'corner').click();
  for (const d of ['7', '8']) await key(page, d).click();

  const centre = cell(page, target).locator('.centre');
  const corner = cell(page, target).locator('.corner').first();
  await expect(centre).toHaveText('123');
  await expect(corner).toContainText('7');

  // Neither overlaps: corner marks sit at the edges, centre in the middle
  // (research.md D6).
  const [cBox, kBox] = [await centre.boundingBox(), await corner.boundingBox()];
  expect(cBox && kBox).toBeTruthy();
  const overlaps = cBox!.y < kBox!.y + kBox!.height && kBox!.y < cBox!.y + cBox!.height;
  expect(overlaps, 'centre and corner marks overlap vertically').toBe(false);
});

test('erase walks value, then marks, then colour — without changing mode', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'colour').click();
  await page.locator('[data-swatch="l4"]').click();
  await mode(page, 'centre').click();
  await key(page, '1').click();
  await mode(page, 'corner').click();
  await key(page, '9').click();
  await mode(page, 'value').click();
  await key(page, '4').click();

  await expect(cell(page, target).locator('.value')).toHaveText('4');
  await expect(cell(page, target)).toHaveClass(/coloured/);

  // Three presses, no mode switching (FR-025, FR-041).
  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.value')).toHaveCount(0);
  await expect(cell(page, target).locator('.centre')).toHaveText('1');

  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.centre')).toHaveCount(0);
  await expect(cell(page, target).locator('.corner')).toHaveCount(0);
  await expect(cell(page, target)).toHaveClass(/coloured/);

  await key(page, 'erase').click();
  await expect(cell(page, target)).not.toHaveClass(/coloured/);

  // A fourth press on an empty cell does nothing and reports nothing (FR-026).
  await key(page, 'erase').click();
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('nine corner marks spread across two edges and leave the middle clear', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'corner').click();
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) await key(page, d).click();

  // Five along the top, four along the bottom — not doubled up in a corner.
  await expect(cell(page, target).locator('.corner-row-top')).toHaveText('12345');
  await expect(cell(page, target).locator('.corner-row-bottom')).toHaveText('6789');

  // Centre marks still fit between them (research.md D6).
  await mode(page, 'centre').click();
  for (const d of ['4', '7']) await key(page, d).click();
  const centre = cell(page, target).locator('.centre');
  await expect(centre).toHaveText('47');

  const [cBox, top, bottom] = await Promise.all([
    centre.boundingBox(),
    cell(page, target).locator('.corner-row-top').boundingBox(),
    cell(page, target).locator('.corner-row-bottom').boundingBox(),
  ]);
  expect(cBox!.y).toBeGreaterThanOrEqual(top!.y + top!.height - 1);
  expect(cBox!.y + cBox!.height).toBeLessThanOrEqual(bottom!.y + 1);
});

test('corner marks read ascending whatever order they were pressed in', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'corner').click();
  // Deliberately out of order.
  for (const d of ['7', '2', '9', '4', '1']) await key(page, d).click();

  // Read the marks in document order, which is reading order in the layout.
  const shown = await cell(page, target)
    .locator('.corner')
    .evaluateAll((nodes) => nodes.map((n) => n.textContent?.trim() ?? ''));
  expect(shown.join('')).toBe('12479');

  // And their positions run left to right, top to bottom.
  const boxes = await cell(page, target)
    .locator('.corner')
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect()).map((r) => [r.x, r.y]));
  const sorted = [...boxes].sort((a, b) => a[1]! - b[1]! || a[0]! - b[0]!);
  expect(boxes, 'corner marks are not laid out in reading order').toEqual(sorted);
});

test('a value hides corner marks as well as centre marks (FR-023, FR-024)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await cell(page, target).click();
  await mode(page, 'corner').click();
  for (const d of ['3', '6']) await key(page, d).click();
  await expect(cell(page, target).locator('.corner')).toHaveCount(2);

  await mode(page, 'value').click();
  await key(page, '8').click();
  await expect(cell(page, target).locator('.value')).toHaveText('8');
  await expect(cell(page, target).locator('.corner')).toHaveCount(0);

  await key(page, 'erase').click();
  await expect(cell(page, target).locator('.corner')).toHaveCount(2);
});
