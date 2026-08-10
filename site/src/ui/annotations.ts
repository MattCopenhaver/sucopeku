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

const renderCentre: Renderer = (cell, payload) => {
  const values = payload as readonly number[];
  if (values.length === 0) return;

  const box = document.createElement('span');
  box.className = 'centre';
  box.dataset.count = String(values.length);

  // Up to five sit on one line. Beyond that they wrap to two balanced rows
  // rather than shrinking further: a second row costs vertical space the middle
  // of the cell has, while shrinking costs legibility it does not
  // (003 FR-058, research.md D12).
  if (values.length <= 5) {
    box.textContent = values.join('');
  } else {
    const half = Math.ceil(values.length / 2);
    for (const line of [values.slice(0, half), values.slice(half)]) {
      const row = document.createElement('span');
      row.className = 'centre-row';
      row.textContent = line.join('');
      box.append(row);
    }
  }
  cell.append(box);
};

/**
 * Corner marks go in the corners.
 *
 * Eight perimeter positions, corners filled first, then edge midpoints. The
 * middle is never used, so centre and corner marks cannot collide (US3
 * scenario 2). A ninth mark shares the first slot rather than claiming a ninth
 * position — nine corner marks in one cell convey almost nothing, so that is
 * the case worth degrading (research.md D6).
 */
/**
 * Which positions a given number of corner marks uses, listed in reading order.
 *
 * Two rules at once. Corners fill before edges, so few marks sit in the corners
 * — and each list is already in reading order, so the marks always read
 * ascending left to right, top to bottom. Filling one fixed slot sequence
 * instead put the fifth mark at top-centre, *between* the first and second, and
 * the cell read 1 5 2. Values were sorted the whole time; the arrangement was
 * what looked arbitrary.
 */
const LAYOUT: Readonly<Record<number, readonly string[]>> = {
  1: ['tl'],
  2: ['tl', 'tr'],
  3: ['tl', 'tr', 'bl'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tc', 'tr', 'bl', 'br'],
  6: ['tl', 'tc', 'tr', 'bl', 'bc', 'br'],
  7: ['tl', 'tc', 'tr', 'ml', 'bl', 'bc', 'br'],
  8: ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'],
};

const renderCorner: Renderer = (cell, payload) => {
  const values = payload as readonly number[];
  if (values.length === 0) return;

  // Nine marks need a ninth position, and there are eight. Only the bottom
  // changes: the first five keep exactly the slots they hold at eight marks,
  // and the last four spread evenly along the bottom edge in place of the three
  // that would sit there. Rebuilding the whole arrangement made the cell jump
  // when the ninth mark landed (research.md D6).
  if (values.length === 9) {
    const top = LAYOUT[8]!.slice(0, 5);
    values.slice(0, 5).forEach((value, index) => {
      const box = document.createElement('span');
      box.className = `corner corner-${top[index]}`;
      box.dataset.count = '9';
      box.textContent = String(value);
      cell.append(box);
    });

    const bottom = document.createElement('span');
    bottom.className = 'corner corner-row corner-row-bottom';
    bottom.dataset.count = '9';
    for (const value of values.slice(5)) {
      const digit = document.createElement('span');
      digit.textContent = String(value);
      bottom.append(digit);
    }
    cell.append(bottom);
    return;
  }

  const slots = LAYOUT[values.length] ?? LAYOUT[8]!;
  values.forEach((value, index) => {
    const slot = slots[index];
    if (!slot) return;
    const box = document.createElement('span');
    box.className = `corner corner-${slot}`;
    box.dataset.count = String(values.length);
    box.textContent = String(value);
    cell.append(box);
  });
};

const renderColour: Renderer = (cell, payload) => {
  const entry = paletteEntry(payload as string);
  if (!entry) return;
  cell.style.setProperty('--cell-colour', entry.colour);
  cell.classList.add('coloured', `on-${entry.palette}`);
};

export const renderers: Readonly<Record<string, Renderer>> = {
  [CENTRE]: renderCentre,
  [CORNER]: renderCorner,
  [COLOUR]: renderColour,
};
