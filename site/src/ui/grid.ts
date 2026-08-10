import { CENTRE, CORNER } from '../game/annotations/marks.js';
import { COLOUR } from '../game/annotations/colour.js';
import type { Game } from '../game/state.js';
import { renderers } from './annotations.js';

/**
 * The grid. Cells are buttons so that keyboard, pointer, and touch all reach
 * them through the same path — which is what makes input parity a property of
 * the markup rather than of three separate handlers (002 FR-017).
 *
 * A cell draws back to front: colour, corner marks, then either the value or
 * the centre marks — never both (003 data-model.md, research.md D9).
 *
 * Takes no change callback: selection is reflected by moving a class rather
 * than by re-rendering, for the reason `paintSelection` explains.
 */
export function renderGrid(root: HTMLElement, game: Game): void {
  const { width, height } = game.ruleset.geometry;
  root.style.setProperty('--cols', String(width));

  // Every change rebuilds the grid, which would drop focus and strand a
  // keyboard player after each digit. Remember whether focus was in here so it
  // can be put back on the selected cell below.
  const hadFocus = root.contains(document.activeElement);
  root.replaceChildren();

  const board = game.board;
  const { conflicts } = game.evaluation;

  for (let cell = 0; cell < width * height; cell += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.cell = String(cell);

    const value = board[cell];
    const given = game.isGiven(cell);

    renderers[COLOUR]?.(button, game.annotation(COLOUR, cell));
    renderers[CORNER]?.(button, game.annotation(CORNER, cell));

    if (value === null || value === undefined) {
      // Marks are hidden by a value, never deleted (003 FR-023, FR-024).
      renderers[CENTRE]?.(button, game.annotation(CENTRE, cell));
    } else {
      const digit = document.createElement('span');
      digit.className = 'value';
      digit.textContent = String(value);
      button.append(digit);
    }

    if (given) button.classList.add('given');
    if (conflicts.has(cell)) button.classList.add('conflict');
    if (game.selection.has(cell)) button.classList.add('selected');

    button.setAttribute('aria-label', describe(cell, width, value, given));
    if (given) button.setAttribute('aria-readonly', 'true');

    // Reaching a cell by Tab must select it, or a keyboard player types into
    // nothing (002 FR-017). This deliberately does not re-render: browsers
    // focus on mousedown, so rebuilding here would destroy the button before
    // its own click event fired, breaking pointer input to fix keyboard input.
    //
    // A cell already in the selection is left alone, so that focus arriving as
    // part of a modified click does not collapse the multi-cell selection the
    // pointer handler just built.
    button.addEventListener('focus', () => {
      if (game.selection.has(cell)) return;
      game.selectOnly(cell);
      paintSelection(root, game);
    });

    root.append(button);
  }

  if (hadFocus && game.selectedCell !== null) {
    root.querySelector<HTMLElement>(`[data-cell="${game.selectedCell}"]`)?.focus();
  }

  bindSelection(root, game);
}

/**
 * Selection by pointer: click, modified click, and drag — one path for mouse,
 * touch, and pen (003 FR-015 to FR-017, research.md D3).
 *
 * Cells are found with `elementFromPoint` rather than by listening for
 * `pointerenter` on each one. Once a pointer is captured — which happens
 * implicitly on touch — every later event delivers to the element the drag
 * *started* on, so `pointerenter` never fires elsewhere and a drag would select
 * exactly one cell. That failure looks perfect on a mouse and is total on a
 * phone, which is why it is worth the extra hit-test.
 */
function bindSelection(root: HTMLElement, game: Game): void {
  let dragging = false;

  const cellAt = (x: number, y: number): number | null => {
    const element = document.elementFromPoint(x, y);
    const holder = element?.closest<HTMLElement>('[data-cell]');
    if (!holder || !root.contains(holder)) return null;
    return Number(holder.dataset.cell);
  };

  root.addEventListener('pointerdown', (event) => {
    const cell = cellAt(event.clientX, event.clientY);
    if (cell === null) return;
    dragging = true;

    if (event.ctrlKey || event.metaKey) game.addToSelection(cell);
    else if (event.shiftKey) game.extendTo(cell);
    else game.selectOnly(cell);
    paintSelection(root, game);
  });

  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const cell = cellAt(event.clientX, event.clientY);
    // A drag that leaves the grid and returns picks up where it re-enters
    // rather than being abandoned (003 EC-003).
    if (cell === null || game.selection.has(cell)) return;
    game.addToSelection(cell);
    paintSelection(root, game);
  });

  const end = (): void => {
    dragging = false;
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
}

/**
 * Reflects the selection by moving a class, never by rebuilding.
 *
 * This is the same rule the focus handler follows and for the same reason:
 * pointerdown precedes click, so re-rendering here would destroy the button
 * before its own click event fired and the click would never complete. Feature
 * 002 documented that trap for focus; routing selection through `onChange`
 * walked straight back into it, and four tests hung until this replaced it.
 */
function paintSelection(root: HTMLElement, game: Game): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-cell]')) {
    node.classList.toggle('selected', game.selection.has(Number(node.dataset.cell)));
  }
}

function describe(
  cell: number,
  width: number,
  value: number | null | undefined,
  given: boolean,
): string {
  const r = Math.floor(cell / width) + 1;
  const c = (cell % width) + 1;
  const where = `r${r}c${c}`;
  if (value === null || value === undefined) return `${where}, empty`;
  return given ? `${where}, ${value}, fixed` : `${where}, ${value}`;
}
