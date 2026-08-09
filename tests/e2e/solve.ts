import type { Page } from '@playwright/test';

/**
 * A solver, used only as the test's oracle.
 *
 * The site ships none and must not: completion is decided by the constraints
 * being satisfied, never by comparison against a stored answer (FR-007). This
 * one lives in the test suite so a test can *play* a puzzle to the end, which is
 * something a person can do and therefore something Principle VIII allows us to
 * check. It reads the givens from the rendered grid, exactly as a player would.
 */

const SIZE = 9;

export type Solution = readonly number[];

function peers(cell: number): number[] {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const found = new Set<number>();

  for (let i = 0; i < SIZE; i += 1) {
    found.add(row * SIZE + i);
    found.add(i * SIZE + col);
    found.add((boxRow + Math.floor(i / 3)) * SIZE + (boxCol + (i % 3)));
  }
  found.delete(cell);
  return [...found];
}

const PEERS: readonly number[][] = Array.from({ length: SIZE * SIZE }, (_, cell) => peers(cell));

/** Plain backtracking, choosing the most constrained cell first. */
function search(board: (number | null)[]): boolean {
  let target = -1;
  let candidates: number[] = [];

  for (let cell = 0; cell < board.length; cell += 1) {
    if (board[cell] !== null) continue;
    const taken = new Set(PEERS[cell]?.map((peer) => board[peer]));
    const options = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !taken.has(value));
    if (options.length === 0) return false;
    if (target === -1 || options.length < candidates.length) {
      target = cell;
      candidates = options;
      if (options.length === 1) break;
    }
  }

  if (target === -1) return true; // nothing left empty

  for (const value of candidates) {
    board[target] = value;
    if (search(board)) return true;
    board[target] = null;
  }
  return false;
}

/** Reads the grid on screen and returns a full solution for it. */
export async function solutionFor(page: Page): Promise<Solution> {
  const shown = await page.locator('.cell').evaluateAll((nodes) =>
    nodes.map((node) => {
      const text = node.textContent?.trim() ?? '';
      return text === '' ? null : Number(text);
    }),
  );

  const board = [...shown];
  if (!search(board)) throw new Error('the puzzle on screen has no solution');
  return board as number[];
}

/**
 * Fills every empty cell, one digit at a time: select a digit, then place it
 * everywhere it belongs. Grouping this way is also how a person would do it.
 */
export async function solveByClicking(page: Page, solution: Solution): Promise<void> {
  await fill(page, solution, (selector) => page.locator(selector).click());
}

export async function solveByTapping(page: Page, solution: Solution): Promise<void> {
  await fill(page, solution, (selector) => page.locator(selector).tap());
}

/**
 * `act` is the only way this touches the page, so "solved by tapping" really
 * means every pad press and every cell was a tap — which is what makes the
 * parity claim in SC-003 worth anything.
 */
async function fill(
  page: Page,
  solution: Solution,
  act: (selector: string) => Promise<void>,
): Promise<void> {
  const empty = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes
        .map((node, index) => (node.textContent?.trim() === '' ? index : -1))
        .filter((index) => index >= 0),
    );

  for (let digit = 1; digit <= 9; digit += 1) {
    const cells = empty.filter((cell) => solution[cell] === digit);
    if (cells.length === 0) continue;
    await act(`[data-key="${digit}"]`);
    for (const cell of cells) await act(`[data-cell="${cell}"]`);
  }
}
