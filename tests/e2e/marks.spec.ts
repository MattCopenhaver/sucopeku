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
