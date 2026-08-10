import { expect, test, type Page } from '@playwright/test';

/**
 * Conflicts are what the constraint engine is for. These tests reach it only
 * through the board, which is the point: the engine has no other entry a player
 * could use, so it has no other entry a test may use either (Principle VIII).
 */

const WIDTH = 9;

const row = (cell: number) => Math.floor(cell / WIDTH);
const col = (cell: number) => cell % WIDTH;
const box = (cell: number) => Math.floor(row(cell) / 3) * 3 + Math.floor(col(cell) / 3);

async function boardValues(page: Page): Promise<(number | null)[]> {
  return page.locator('.cell').evaluateAll((nodes) =>
    nodes.map((node) => {
      const text = node.querySelector('.value')?.textContent?.trim() ?? '';
      return text === '' ? null : Number(text);
    }),
  );
}

/**
 * Two empty cells sharing the named region, and a digit that appears nowhere
 * either of them can see.
 *
 * Picking the digit matters: a hardcoded one is usually already somewhere in the
 * puzzle, so the *first* placement conflicts and the test proves nothing about
 * the second. This way the setup is quiet and the conflict under test is the
 * only one on the board.
 */
async function conflictSetup(
  page: Page,
  group: (cell: number) => number,
): Promise<{ a: number; b: number; digit: number }> {
  const board = await boardValues(page);
  const sees = (cell: number): Set<number> => {
    const values = new Set<number>();
    board.forEach((value, other) => {
      if (value === null || other === cell) return;
      if (row(other) === row(cell) || col(other) === col(cell) || box(other) === box(cell)) {
        values.add(value);
      }
    });
    return values;
  };

  const empty = board.map((value, cell) => (value === null ? cell : -1)).filter((c) => c >= 0);

  for (const a of empty) {
    for (const b of empty) {
      if (b <= a || group(a) !== group(b)) continue;
      const blocked = new Set([...sees(a), ...sees(b)]);
      const digit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((value) => !blocked.has(value));
      if (digit !== undefined) return { a, b, digit };
    }
  }
  throw new Error('no quiet pair shares that region');
}

async function place(page: Page, digit: number, cell: number): Promise<void> {
  await page.locator(`[data-cell="${cell}"]`).click();
  await page.locator(`[data-key="${digit}"]`).click();
}

for (const [name, group] of [
  ['row', row],
  ['column', col],
  ['box', box],
] as const) {
  test(`the same digit twice in a ${name} marks both cells`, async ({ page }) => {
    await page.goto('./');
    const { a, b, digit } = await conflictSetup(page, group);

    await place(page, digit, a);
    await expect(page.locator(`[data-cell="${a}"]`)).not.toHaveClass(/conflict/);

    await place(page, digit, b);
    await expect(page.locator(`[data-cell="${a}"]`)).toHaveClass(/conflict/);
    await expect(page.locator(`[data-cell="${b}"]`)).toHaveClass(/conflict/);
  });
}

test('the marking clears when the conflict is resolved (FR-020)', async ({ page }) => {
  await page.goto('./');
  const { a, b, digit } = await conflictSetup(page, row);

  await place(page, digit, a);
  await place(page, digit, b);
  await expect(page.locator(`[data-cell="${a}"]`)).toHaveClass(/conflict/);

  await page.locator(`[data-cell="${b}"]`).click();
  await page.locator('[data-key="erase"]').click();

  await expect(page.locator(`[data-cell="${a}"]`)).not.toHaveClass(/conflict/);
  await expect(page.locator(`[data-cell="${b}"]`)).not.toHaveClass(/conflict/);
});

test('a conflict is visible without colour (SC-009)', async ({ page }) => {
  await page.goto('./');
  const { a, b, digit } = await conflictSetup(page, row);

  // Strip every colour from the page, then compare the same cell holding the
  // same digit, conflicting and not. If colour were the only signal these two
  // images would be identical.
  await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });

  await place(page, digit, a);
  await place(page, digit, b);
  await expect(page.locator(`[data-cell="${a}"]`)).toHaveClass(/conflict/);
  const conflicting = await page.locator(`[data-cell="${a}"]`).screenshot();

  await page.locator(`[data-cell="${b}"]`).click();
  await page.locator('[data-key="erase"]').click();
  await expect(page.locator(`[data-cell="${a}"]`)).not.toHaveClass(/conflict/);
  const settled = await page.locator(`[data-cell="${a}"]`).screenshot();

  expect(
    conflicting.equals(settled),
    'in greyscale, a conflicting cell looks identical to a settled one',
  ).toBe(false);
});
