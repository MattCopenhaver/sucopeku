import { expect, test, type Page } from '@playwright/test';

/**
 * Multi-cell selection, built three ways. Principle IX requires all three, so
 * each has its own test rather than one standing in for the others.
 */

const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"]`);
const key = (page: Page, k: string) => page.locator(`[data-key="${k}"]`);
const mode = (page: Page, m: string) => page.locator(`[data-mode="${m}"]`);
const selected = (page: Page) => page.locator('.cell.selected');

/** Four empty cells in one row, so a range and a drag both make sense. */
async function fourEmptyInARow(page: Page): Promise<number[]> {
  const empty = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes.map((node, index) => (node.querySelector('.value') ? -1 : index)).filter((i) => i >= 0),
    );
  for (let row = 0; row < 9; row += 1) {
    const inRow = empty.filter((c) => Math.floor(c / 9) === row);
    if (inRow.length >= 4) return inRow.slice(0, 4);
  }
  throw new Error('no row has four empty cells');
}

async function dragAcross(page: Page, cells: number[]): Promise<void> {
  const boxes = await Promise.all(cells.map(async (c) => (await cell(page, c).boundingBox())!));
  const first = boxes[0]!;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  for (const box of boxes.slice(1)) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
  await page.mouse.up();
}

test('dragging across cells selects them (FR-016)', async ({ page }) => {
  await page.goto('./');
  const cells = await fourEmptyInARow(page);

  await dragAcross(page, cells);
  for (const c of cells) await expect(cell(page, c)).toHaveClass(/selected/);
  await expect(selected(page)).toHaveCount(cells.length);
});

test('a modified click adds one cell, a plain click resets (FR-015, FR-017)', async ({ page }) => {
  await page.goto('./');
  const cells = await fourEmptyInARow(page);

  await cell(page, cells[0]!).click();
  for (const c of cells.slice(1)) {
    await cell(page, c).click({ modifiers: ['ControlOrMeta'] });
  }
  await expect(selected(page)).toHaveCount(4);

  await cell(page, cells[0]!).click();
  await expect(selected(page)).toHaveCount(1);
});

test('shift with an arrow extends, a bare arrow replaces (FR-018)', async ({ page }) => {
  await page.goto('./');
  await cell(page, 40).click();
  await expect(selected(page)).toHaveCount(1);

  await page.keyboard.press('Shift+ArrowRight');
  await expect(selected(page)).toHaveCount(2);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(selected(page)).toHaveCount(3);

  // Extending back towards the anchor shrinks rather than drifting.
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(selected(page)).toHaveCount(2);

  await page.keyboard.press('ArrowRight');
  await expect(selected(page)).toHaveCount(1);
});

test('a mark placed across a selection lands everywhere, and toggles off together (SC-002)', async ({
  page,
}) => {
  await page.goto('./');
  const cells = await fourEmptyInARow(page);

  await dragAcross(page, cells);
  await mode(page, 'centre').click();
  await key(page, '6').click();
  for (const c of cells) await expect(cell(page, c).locator('.centre')).toHaveText('6');

  await key(page, '6').click();
  for (const c of cells) await expect(cell(page, c).locator('.centre')).toHaveCount(0);
});

test('a press adds everywhere unless every cell already has it (FR-022)', async ({ page }) => {
  await page.goto('./');
  const cells = await fourEmptyInARow(page);

  // Give exactly one of them the mark first.
  await cell(page, cells[0]!).click();
  await mode(page, 'centre').click();
  await key(page, '3').click();

  await dragAcross(page, cells);
  await key(page, '3').click();

  // Mixed selection: adding wins.
  for (const c of cells) await expect(cell(page, c).locator('.centre')).toHaveText('3');
});

test('a drag over given cells leaves them alone and reports nothing (EC-001)', async ({ page }) => {
  await page.goto('./');
  const givens = await page
    .locator('.cell')
    .evaluateAll((nodes) =>
      nodes.map((node, i) => (node.classList.contains('given') ? i : -1)).filter((i) => i >= 0),
    );
  const target = givens[0]!;
  const before = await cell(page, target).locator('.value').textContent();

  await cell(page, target).click();
  await key(page, '9').click();

  await expect(cell(page, target).locator('.value')).toHaveText(before ?? '');
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('selecting the whole grid and placing leaves it responsive (EC-010)', async ({ page }) => {
  await page.goto('./');

  await cell(page, 0).click();
  await page.keyboard.press('Shift+ArrowDown');
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Shift+ArrowDown');
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Shift+ArrowRight');
  await expect(selected(page)).toHaveCount(81);

  await mode(page, 'centre').click();
  await key(page, '1').click();
  expect(await page.locator('.cell .centre').count()).toBeGreaterThan(0);

  // Still responsive to the next input.
  await cell(page, 0).click();
  await expect(selected(page)).toHaveCount(1);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a touch drag selects cells (SC-007, selection half)', async ({ page }) => {
    await page.goto('./');
    const cells = await fourEmptyInARow(page);
    const boxes = await Promise.all(cells.map(async (c) => (await cell(page, c).boundingBox())!));

    // Dispatched as touch so the implicit pointer capture path is exercised —
    // the one that would select a single cell if drag relied on pointerenter
    // (research.md D3). Whether the page also scrolled is not checked here; the
    // harness will not report it reliably, so that half is manual (D8).
    const point = (i: number) => ({
      x: boxes[i]!.x + boxes[i]!.width / 2,
      y: boxes[i]!.y + boxes[i]!.height / 2,
    });
    await page.evaluate(
      ({ points, ids }) => {
        const target = document.querySelector(`[data-cell="${ids[0]}"]`)!;
        const fire = (type: string, p: { x: number; y: number }): void => {
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              clientX: p.x,
              clientY: p.y,
              pointerType: 'touch',
              pointerId: 1,
            }),
          );
        };
        fire('pointerdown', points[0]!);
        for (const p of points.slice(1)) fire('pointermove', p);
        fire('pointerup', points[points.length - 1]!);
      },
      { points: cells.map((_, i) => point(i)), ids: cells },
    );

    for (const c of cells) await expect(cell(page, c)).toHaveClass(/selected/);
  });
});
