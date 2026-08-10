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
  // Sized by how many there are: comfortable when few, shrinking as they
  // multiply (003 FR-052, research.md D12). A cell holds two or three
  // candidates far more often than nine.
  box.dataset.count = String(Math.min(values.length, 9));
  box.textContent = values.join('');
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
const SLOTS = ['tl', 'tr', 'bl', 'br', 'tc', 'bc', 'ml', 'mr'] as const;

const renderCorner: Renderer = (cell, payload) => {
  const values = payload as readonly number[];
  if (values.length === 0) return;

  const bySlot = new Map<string, number[]>();
  values.forEach((value, index) => {
    const slot = SLOTS[index % SLOTS.length]!;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), value]);
  });

  for (const [slot, digits] of bySlot) {
    const box = document.createElement('span');
    box.className = `corner corner-${slot}`;
    box.dataset.count = String(Math.min(values.length, 9));
    box.textContent = digits.join('');
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
  [CENTRE]: renderCentre,
  [CORNER]: renderCorner,
  [COLOUR]: renderColour,
};
