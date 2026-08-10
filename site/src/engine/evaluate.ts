import { primitiveFor } from './primitives.js';
import type { Board, Evaluation, Ruleset } from './types.js';

/**
 * Evaluates a board against a ruleset.
 *
 * This function is the reason the ruleset is data. It resolves each constraint's
 * primitive from a registry and unions what they report. It does not know what
 * game it is evaluating, and adding a ruleset must never require changing it
 * (FR-006).
 *
 * Nothing here mentions rows, columns, boxes, or the number nine. If it ever
 * does, the guarantee is gone.
 */
export function evaluate(board: Board, ruleset: Ruleset): Evaluation {
  const conflicts = new Set<number>();

  for (const constraint of ruleset.constraints) {
    const primitive = primitiveFor(constraint.primitive);
    if (!primitive) {
      // An unknown primitive is a defect in the data, not a reason to stop. The
      // site still runs and the rest of the ruleset is still applied
      // (contracts/ruleset.md).
      continue;
    }
    for (const cell of primitive(constraint.cells, board)) conflicts.add(cell);
  }

  // Complete means every cell filled with no constraint violated — never
  // comparison against a stored answer (FR-007). It is why the site holds no
  // solution, and why a puzzle's uniqueness has to be established before it
  // ships rather than checked here.
  const cellCount = ruleset.geometry.width * ruleset.geometry.height;
  let filled = 0;
  for (let cell = 0; cell < cellCount; cell += 1) {
    const value = board[cell];
    if (value !== null && value !== undefined) filled += 1;
  }

  return { conflicts, complete: filled === cellCount && conflicts.size === 0 };
}
