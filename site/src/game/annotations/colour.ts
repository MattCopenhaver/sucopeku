import { register, type AnnotationKind } from './registry.js';
import { isPaletteEntry } from '../palettes.js';

/**
 * A cell's background colour.
 *
 * One colour per cell, so the payload is a single identifier rather than a set.
 * Applying the colour a cell already holds removes it (003 FR-033), which falls
 * out of `add` being asked for something `has` already reports.
 *
 * Colour is the one kind that applies to cells that came with the puzzle: it
 * annotates the cell rather than what is written in it.
 */
export const COLOUR = 'colour';

const colourKind: AnnotationKind<string> = {
  id: COLOUR,
  acceptsGivens: true,

  empty: () => '',
  isEmpty: (payload) => payload === '',
  has: (payload, input) => payload === String(input),
  add: (_payload, input) => String(input),
  remove: () => '',

  parse(raw: unknown) {
    if (typeof raw !== 'string') return undefined;
    return isPaletteEntry(raw) ? raw : undefined;
  },
};

register(colourKind);
