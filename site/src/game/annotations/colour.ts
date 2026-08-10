import { register, type AnnotationKind } from './registry.js';
import { isPaletteEntry, paletteOrder } from '../palettes.js';

/**
 * A cell's colours.
 *
 * A set, not a single value: a cell may hold several and shows them split
 * radially (003 FR-003). That makes colour the same shape as centre and corner
 * marks, so it inherits their toggle rule rather than needing one of its own —
 * applying a colour a cell already holds removes it and leaves the rest
 * (003 FR-033).
 *
 * Colour is the one kind that applies to cells that came with the puzzle: it
 * annotates the cell rather than what is written in it.
 */
export const COLOUR = 'colour';

/** Palette order, not the order they were pressed, so nothing reshuffles
 *  (003 FR-060). */
const ordered = (ids: readonly string[]): readonly string[] =>
  [...ids].sort((a, b) => paletteOrder(a) - paletteOrder(b));

const colourKind: AnnotationKind<readonly string[]> = {
  id: COLOUR,
  acceptsGivens: true,

  empty: () => [],
  isEmpty: (payload) => payload.length === 0,
  has: (payload, input) => payload.includes(String(input)),
  add: (payload, input) =>
    payload.includes(String(input)) ? payload : ordered([...payload, String(input)]),
  remove: (payload, input) => payload.filter((id) => id !== String(input)),

  parse(raw: unknown) {
    // Progress written before a cell could hold several held a single string.
    // Dropped rather than migrated: the format is provisional before 1.0 and
    // the failure is a cell losing its colour, not an error.
    if (!Array.isArray(raw)) return undefined;
    const ids = raw.filter((id): id is string => typeof id === 'string' && isPaletteEntry(id));
    return ids.length > 0 ? ordered(ids) : undefined;
  },
};

register(colourKind);
