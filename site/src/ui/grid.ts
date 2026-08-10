import type { Game } from '../game/state.js';

/**
 * The grid. Cells are buttons so that keyboard, pointer, and touch all reach
 * them through the same path — which is what makes input parity a property of
 * the markup rather than of three separate handlers (FR-017).
 */
export function renderGrid(root: HTMLElement, game: Game, onChange: () => void): void {
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
    button.textContent = value === null || value === undefined ? '' : String(value);

    if (game.isGiven(cell)) button.classList.add('given');
    if (conflicts.has(cell)) button.classList.add('conflict');
    if (game.selectedCell === cell) button.classList.add('selected');

    button.setAttribute('aria-label', describe(cell, width, value, game.isGiven(cell)));
    if (game.isGiven(cell)) button.setAttribute('aria-readonly', 'true');
    button.disabled = false;

    // Choosing a cell selects it and nothing more. What goes in it is the next
    // action, from the pad or the keyboard (FR-010).
    button.addEventListener('click', () => {
      game.selectCell(cell);
      onChange();
    });

    // Reaching a cell by Tab must select it, or a keyboard player types into
    // nothing (FR-017). This deliberately does not re-render: browsers focus on
    // mousedown, so rebuilding here would destroy the button before its own
    // click event fired, breaking pointer input to fix keyboard input.
    button.addEventListener('focus', () => {
      if (game.selectedCell === cell) return;
      game.selectCell(cell);
      for (const marked of root.querySelectorAll('.cell.selected')) {
        marked.classList.remove('selected');
      }
      button.classList.add('selected');
    });

    root.append(button);
  }

  if (hadFocus && game.selectedCell !== null) {
    root.querySelector<HTMLElement>(`[data-cell="${game.selectedCell}"]`)?.focus();
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
