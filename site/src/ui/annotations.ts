import { CENTRE, CORNER } from '../game/annotations/marks.js';
import { COLOUR } from '../game/annotations/colour.js';
import { paletteEntry } from '../game/palettes.js';
import type { Payload } from '../game/annotations/registry.js';

/**
 * How each annotation kind looks.
 *
 * Kept apart from `game/annotations/`, which holds behaviour and never touches
 * the DOM. Both are keyed by the same identifier, so adding a kind means one
 * file in each and touching neither of the others — 003 FR-007 in practice
 * (contracts/annotations.md).
 */
export type Renderer = (cell: HTMLElement, payload: Payload) => void;

const renderMarks = (className: string): Renderer => {
  return (cell, payload) => {
    const values = payload as readonly number[];
    if (values.length === 0) return;
    const box = document.createElement('span');
    box.className = className;
    box.textContent = values.join('');
    cell.append(box);
  };
};

/**
 * Corner marks go along the top edge, up to five, then the bottom edge.
 *
 * Never the middle. The traditional three-by-three perimeter has eight usable
 * positions once the middle is reserved, and a nine-value ruleset can produce
 * nine marks — so any scheme reaching nine that way collides with centre marks
 * exactly when a cell is most crowded (research.md D6).
 */
const renderCorner: Renderer = (cell, payload) => {
  const values = payload as readonly number[];
  if (values.length === 0) return;
  for (const [edge, slice] of [
    ['top', values.slice(0, 5)],
    ['bottom', values.slice(5, 9)],
  ] as const) {
    if (slice.length === 0) continue;
    const box = document.createElement('span');
    box.className = `corner corner-${edge}`;
    box.textContent = slice.join(' ');
    cell.append(box);
  }
};

const renderColour: Renderer = (cell, payload) => {
  const entry = paletteEntry(payload as string);
  if (!entry) return;
  cell.style.setProperty('--cell-colour', entry.colour);
  cell.classList.add('coloured', `on-${entry.palette}`);
};

export const renderers: Readonly<Record<string, Renderer>> = {
  [CENTRE]: renderMarks('centre'),
  [CORNER]: renderCorner,
  [COLOUR]: renderColour,
};
