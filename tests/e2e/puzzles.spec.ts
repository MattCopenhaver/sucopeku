import { expect, test, type Page } from '@playwright/test';
import { solutionFor, solveByClicking } from './solve.js';

/**
 * Which puzzle a player gets, and how they get back to it. The address is the
 * only thing that names a puzzle, so these tests read it the way a player reads
 * their address bar.
 */

const named = (page: Page): string | null => new URL(page.url()).searchParams.get('puzzle');

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

test('arriving without a puzzle gives one an address (FR-028, SC-007)', async ({ page }) => {
  await page.goto('./');
  expect(named(page)).toMatch(/^p\d{2}$/);
});

test('reloading keeps the same puzzle rather than reshuffling', async ({ page }) => {
  await page.goto('./');
  const first = named(page);

  await page.reload();
  expect(named(page)).toBe(first);
  await page.reload();
  expect(named(page)).toBe(first);
});

test('an address always opens its own puzzle (FR-026, FR-027)', async ({ page }) => {
  await page.goto('./?puzzle=p05');
  expect(named(page)).toBe('p05');

  const shape = await page.locator('.cell').allTextContents();
  await page.goto('./?puzzle=p05');
  expect(await page.locator('.cell').allTextContents()).toEqual(shape);
});

test('an unknown or malformed address still gives a working puzzle (EC-010)', async ({ page }) => {
  for (const address of ['./?puzzle=p99', './?puzzle=', './?puzzle=%%%', './?puzzle=../../etc']) {
    await page.goto(address);
    await expect(page.getByTestId('grid')).toBeVisible();
    expect(named(page)).toMatch(/^p\d{2}$/);
  }
});

test('the new-puzzle control moves to a different puzzle (FR-038)', async ({ page }) => {
  await page.goto('./');
  const first = named(page);

  await page.getByTestId('new-puzzle').click();
  await expect(page.getByTestId('grid')).toBeVisible();
  expect(named(page)).not.toBe(first);
});

test('going back returns to the previous puzzle with its progress (FR-039)', async ({ page }) => {
  await page.goto('./');
  const first = named(page);
  const target = await firstEmpty(page);
  await page.locator('[data-key="8"]').click();
  await page.locator(`[data-cell="${target}"]`).click();

  await page.getByTestId('new-puzzle').click();
  await expect(page.getByTestId('grid')).toBeVisible();

  await page.goBack();
  await expect(page.getByTestId('grid')).toBeVisible();
  expect(named(page)).toBe(first);
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('8');
});

test('arriving at the site resumes the puzzle left unsolved (FR-003)', async ({ page }) => {
  await page.goto('./?puzzle=p11');
  const target = await firstEmpty(page);
  await page.locator('[data-key="9"]').click();
  await page.locator(`[data-cell="${target}"]`).click();

  await page.goto('./');
  expect(named(page)).toBe('p11');
  await expect(page.locator(`[data-cell="${target}"]`)).toHaveText('9');
});

test('once the only played puzzle is solved, arriving gives a fresh one', async ({ page }) => {
  await page.goto('./?puzzle=p03');
  const solution = await solutionFor(page);
  await solveByClicking(page, solution);
  await expect(page.getByTestId('status')).toHaveText('Solved');

  // Nothing unsolved is left to resume, so returning must not drop the player
  // back onto a finished board.
  await page.goto('./');
  expect(named(page)).not.toBe('p03');
  expect(named(page)).toMatch(/^p\d{2}$/);
  await expect(page.getByTestId('status')).toHaveText('');
});
