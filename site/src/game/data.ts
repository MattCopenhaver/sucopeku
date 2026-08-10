import classicRuleset from '../rulesets/classic-9x9.json';
import curated from '../puzzles/curated.json';
import type { Ruleset } from '../engine/types.js';

export interface Puzzle {
  readonly id: string;
  readonly ruleset: string;
  readonly givens: Readonly<Record<string, number>>;
}

const rulesets = new Map<string, Ruleset>([
  [classicRuleset.id, classicRuleset as unknown as Ruleset],
]);

/**
 * Constraints whose cells fall outside the geometry are dropped rather than
 * fatal. A defect in the data should not stop the site starting — the same
 * reasoning as an unknown primitive (contracts/ruleset.md).
 */
function validate(ruleset: Ruleset): Ruleset {
  const cellCount = ruleset.geometry.width * ruleset.geometry.height;
  const constraints = ruleset.constraints.filter((constraint) =>
    constraint.cells.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < cellCount),
  );
  if (constraints.length !== ruleset.constraints.length) {
    console.warn(
      `Ruleset ${ruleset.id}: dropped ${ruleset.constraints.length - constraints.length} constraint(s) addressing cells outside the geometry.`,
    );
  }
  return { ...ruleset, constraints };
}

export function rulesetFor(id: string): Ruleset | undefined {
  const found = rulesets.get(id);
  return found ? validate(found) : undefined;
}

// Cast through `unknown`: TypeScript infers a union of literal shapes from the
// JSON, one per puzzle, because each fixes different cells. The actual contract
// is in contracts/puzzle.md, and `validate` below is what enforces it.
export const puzzles: readonly Puzzle[] = curated.puzzles as unknown as readonly Puzzle[];

export function puzzleFor(id: string | null): Puzzle | undefined {
  if (!id) return undefined;
  return puzzles.find((puzzle) => puzzle.id === id);
}

/** Sparse givens keyed by string index, as they are stored (contracts/puzzle.md). */
export function givenCells(puzzle: Puzzle): ReadonlySet<number> {
  return new Set(Object.keys(puzzle.givens).map(Number));
}
