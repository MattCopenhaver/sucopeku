import type { Board, Primitive } from './types.js';

/**
 * The primitive registry.
 *
 * A primitive is code and is expected to be rare — classic Sudoku needs exactly
 * one. A *ruleset* is data and must never require code (contracts/ruleset.md).
 *
 * If a variant cannot be expressed with what is here, that is the signal a new
 * primitive is needed. It is never a reason to special-case a ruleset inside the
 * evaluator.
 */

/**
 * No value may appear twice among the named cells.
 *
 * Empty cells are ignored, and nothing is said about whether cells are filled —
 * completion is the evaluator's business, not any individual rule's.
 */
const allDifferent: Primitive = (cells, board) => {
  const seenAt = new Map<number, number[]>();

  for (const cell of cells) {
    const value = board[cell];
    if (value === null || value === undefined) continue;
    const existing = seenAt.get(value);
    if (existing) existing.push(cell);
    else seenAt.set(value, [cell]);
  }

  const conflicting: number[] = [];
  for (const occurrences of seenAt.values()) {
    if (occurrences.length > 1) conflicting.push(...occurrences);
  }
  return conflicting;
};

export const primitives: Readonly<Record<string, Primitive>> = {
  'all-different': allDifferent,
};

export function primitiveFor(name: string): Primitive | undefined {
  return primitives[name];
}

export type { Board };
