import { expect, test, type Page } from '@playwright/test';
import { solutionFor, solveByClicking } from './solve.js';

/**
 * Progress is saved without the player asking, and restored when they come
 * back. Every check here is a reload or a second tab — nothing reads storage
 * directly, because a player cannot.
 */

async function firstEmpty(page: Page): Promise<number> {
  const cells = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes
        .map((node, index) => (node.textContent?.trim() === '' ? index : -1))
        .filter((index) => index >= 0),
    );
  const first = cells[0];
  if (first === undefined) throw new Error('the puzzle has no empty cell');
  return first;
}

async function place(page: Page, digit: number, cell: number): Promise<void> {
  await page.locator(`[data-key="${digit}"]`).click();
  await page.locator(`[data-cell="${cell}"]`).click();
}

test('entries survive a reload (SC-006)', async ({ page }) => {
  await page.goto('./');
  const target = await firstEmpty(page);

  await place(page, 3, target);
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('3');

  await page.reload();
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('3');
});

test('a solved puzzle is still solved and still locked after a reload', async ({ page }) => {
  await page.goto('./');
  const solution = await solutionFor(page);
  await solveByClicking(page, solution);
  await expect(page.getByTestId('status')).toHaveText('Solved');

  await page.reload();
  await expect(page.getByTestId('status')).toHaveText('Solved');
  await expect(page.getByTestId('unlock')).toBeVisible();
});

test('work in one tab appears in the other (FR-036)', async ({ page, context }) => {
  await page.goto('./');
  const address = new URL(page.url()).search;
  const target = await firstEmpty(page);

  const other = await context.newPage();
  await other.goto(`./${address}`);
  await expect(other.locator(`[data-cell="${target}"]`)).toHaveText('');

  await place(other, 7, target);

  // No reload here: the first tab must pick this up on its own.
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('7');
  await other.close();
});

test('a tab on a different puzzle does not erase the first puzzle (FR-037)', async ({
  page,
  context,
}) => {
  await page.goto('./');
  const first = new URL(page.url()).search;
  const target = await firstEmpty(page);
  await place(page, 4, target);

  // A second tab loads a different puzzle and saves into it. That write must
  // merge, not replace — the failure it guards against is a tab writing back a
  // whole document it read before the other tab existed.
  const other = await context.newPage();
  await other.goto('./?puzzle=p20');
  const otherTarget = await firstEmpty(other);
  await place(other, 6, otherTarget);
  await other.close();

  await page.goto(`./${first}`);
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('4');

  await page.goto('./?puzzle=p20');
  await expect(page.locator(`[data-cell="${otherTarget}"]`)).toHaveText('6');
});

test('a puzzle keeps its own entries, reached by any route (FR-033)', async ({ page }) => {
  await page.goto('./?puzzle=p01');
  const target = await firstEmpty(page);
  await place(page, 2, target);

  await page.goto('./?puzzle=p02');
  await expect(page.locator(`[data-cell="${target}"]`)).not.toHaveText('2');

  await page.goto('./?puzzle=p01');
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('2');
});

test('the puzzle stays playable when storage is unavailable (EC-006)', async ({ page }) => {
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

  const target = await firstEmpty(page);
  await place(page, 5, target);
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('5');
});
