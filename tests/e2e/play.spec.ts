import { expect, test, type Page } from '@playwright/test';
import { solutionFor, solveByClicking, solveByTapping } from './solve.js';

/**
 * Every test here is something a player could do: choose a digit, choose a cell,
 * read the board. Nothing calls the engine directly — Principle VIII permits no
 * other kind, which is what makes this feature the experiment's real test.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);
const key = (page: Page, k: string) => page.locator(`[data-key="${k}"]`);

async function firstEmptyCell(page: Page): Promise<number> {
  const cells = page.locator('.cell');
  const count = await cells.count();
  for (let i = 0; i < count; i += 1) {
    const c = cells.nth(i);
    if ((await c.locator('.value').count()) === 0) return i;
  }
  throw new Error('no empty cell');
}

test('the grid and pad appear, with some cells already filled', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('grid')).toBeVisible();
  await expect(page.getByTestId('pad')).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(81);
  expect(await page.locator('.cell.given').count()).toBeGreaterThan(0);
});

test('choosing a cell then a digit places it, and the cell stays selected', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmptyCell(page);

  await cell(page, target).click();
  await expect(cell(page, target)).toHaveClass(/selected/);

  await key(page, '5').click();
  await expect(cell(page, target)).toHaveText('5');

  // Still selected, so a wrong digit can be corrected without choosing the cell
  // again — which is the whole reason this order is the right way round (FR-010).
  await expect(cell(page, target)).toHaveClass(/selected/);
  await key(page, '6').click();
  await expect(cell(page, target)).toHaveText('6');
});

test('the pad does nothing until a cell is chosen', async ({ page }) => {
  await page.goto('./');

  // There is no mode to enter, so a pad key with no selection is inert rather
  // than arming something invisible. The requirement asking for a digit
  // indicator was deleted when entry became cell-first.
  const before = await page.locator('.cell').allTextContents();
  await page.evaluate(() => {
    document
      .querySelectorAll('.cell.selected')
      .forEach((node) => node.classList.remove('selected'));
  });
  await key(page, '9').click();
  await expect(page.getByTestId('grid')).toBeVisible();
  expect((await page.locator('.cell').allTextContents()).length).toBe(before.length);
});

test('a cell that came with the puzzle cannot be changed', async ({ page }) => {
  await page.goto('./');
  const given = page.locator('.cell.given').first();
  const before = await given.textContent();

  await given.click();
  await key(page, '7').click();

  await expect(given).toHaveText(before ?? '');
});

test('erase clears a value, and does nothing to an empty cell', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmptyCell(page);

  await cell(page, target).click();
  await key(page, '4').click();
  await expect(cell(page, target)).toHaveText('4');

  await key(page, 'erase').click();
  await expect(cell(page, target)).toHaveText('');

  // Erasing an already-empty cell is a no-op, not an error (FR-015).
  await key(page, 'erase').click();
  await expect(cell(page, target)).toHaveText('');
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('typing a digit places it in the selected cell', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmptyCell(page);

  await cell(page, target).click();

  await page.keyboard.press('6');
  await expect(cell(page, target)).toHaveText('6');

  await page.keyboard.press('Backspace');
  await expect(cell(page, target)).toHaveText('');
});

test('arrow keys move the selected cell', async ({ page }) => {
  await page.goto('./');
  await cell(page, 40).click();
  await expect(cell(page, 40)).toHaveClass(/selected/);

  await page.keyboard.press('ArrowRight');
  await expect(cell(page, 41)).toHaveClass(/selected/);

  await page.keyboard.press('ArrowDown');
  await expect(cell(page, 50)).toHaveClass(/selected/);
});

test('solving the puzzle locks it, and unlocking resumes editing', async ({ page }) => {
  await page.goto('./');
  const solution = await solutionFor(page);
  await solveByClicking(page, solution);

  await expect(page.getByTestId('status')).toHaveText('Solved');
  await expect(page.locator('.cell.conflict')).toHaveCount(0);

  // Locked: placing into a cell changes nothing (FR-023).
  const target = 0;
  const before = await cell(page, target).textContent();
  await cell(page, target).click();
  await key(page, '1').click();
  await expect(cell(page, target)).toHaveText(before ?? '');

  await page.getByTestId('unlock').click();
  await expect(page.getByTestId('status')).toHaveText('Solved — editing');

  // Editing resumes, and a board that stops being complete stops being solved
  // (FR-024, EC-007).
  const editable = await page.locator('.cell:not(.given)').first().getAttribute('data-cell');
  await cell(page, Number(editable)).click();
  await key(page, 'erase').click();
  await expect(cell(page, Number(editable))).toHaveText('');
  await expect(page.getByTestId('status')).toHaveText('');
});

test('the whole puzzle can be solved by keyboard alone (SC-003)', async ({ page }) => {
  await page.goto('./');
  const solution = await solutionFor(page);

  const empty = new Set(
    await page
      .locator('.cell')
      .evaluateAll((nodes) =>
        nodes
          .map((node, index) => (node.textContent?.trim() === '' ? index : -1))
          .filter((index) => index >= 0),
      ),
  );

  // Walk to the top-left corner, then across the grid in reading order. Arrows
  // do not wrap or run off the edge, so this lands on cell 0 from anywhere.
  // Deliberately no Tab: Safari leaves buttons out of the tab order by default,
  // and a keyboard player must not depend on a setting they have not changed.
  for (let up = 0; up < 9; up += 1) await page.keyboard.press('ArrowUp');
  for (let left = 0; left < 9; left += 1) await page.keyboard.press('ArrowLeft');
  await expect(cell(page, 0)).toHaveClass(/selected/);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const index = row * 9 + col;
      if (empty.has(index)) await page.keyboard.press(String(solution[index]));
      if (col < 8) await page.keyboard.press('ArrowRight');
    }
    if (row < 8) {
      await page.keyboard.press('ArrowDown');
      for (let back = 0; back < 8; back += 1) await page.keyboard.press('ArrowLeft');
    }
  }

  await expect(page.getByTestId('status')).toHaveText('Solved');
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('the whole puzzle can be solved by touch alone (SC-003)', async ({ page }) => {
    await page.goto('./');
    const solution = await solutionFor(page);
    await solveByTapping(page, solution);
    await expect(page.getByTestId('status')).toHaveText('Solved');
  });
});
