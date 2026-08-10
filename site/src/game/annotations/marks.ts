import type { Ruleset } from '../../engine/types.js';
import { register, type AnnotationKind } from './registry.js';

/**
 * Centre and corner marks.
 *
 * One implementation registered twice. The payload and every rule are identical
 * — a set of the ruleset's values — and the only difference is where they are
 * drawn, which is the UI's business. Writing this twice would be two places to
 * fix the toggle rule (003 FR-001, FR-002, FR-004).
 */
function markKind(id: string): AnnotationKind<readonly number[]> {
  return {
    id,
    // Cells that came with the puzzle take no marks, for the same reason they
    // take no values (003 FR-006).
    acceptsGivens: false,

    empty: () => [],
    isEmpty: (payload) => payload.length === 0,
    has: (payload, input) => payload.includes(Number(input)),
    add: (payload, input) =>
      payload.includes(Number(input)) ? payload : [...payload, Number(input)].sort((a, b) => a - b),
    remove: (payload, input) => payload.filter((value) => value !== Number(input)),

    parse(raw: unknown, ruleset: Ruleset) {
      if (!Array.isArray(raw)) return undefined;
      const allowed = new Set(ruleset.values);
      // A value the ruleset does not have is dropped rather than fatal — the
      // same tolerance the ruleset loader applies to a bad constraint.
      const values = raw.filter((value): value is number => allowed.has(value as number));
      return values.length > 0 ? values.sort((a, b) => a - b) : undefined;
    },
  };
}

export const CENTRE = 'centre';
export const CORNER = 'corner';

register(markKind(CENTRE));
register(markKind(CORNER));
