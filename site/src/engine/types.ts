/**
 * The shapes the constraint engine works in.
 *
 * Nothing here names Sudoku, rows, columns, boxes, or the number nine. That is
 * the point: a ruleset is data (contracts/ruleset.md), and the evaluator that
 * consumes it must be able to do so without knowing which ruleset it has.
 */

/** The shape of a board. A parameter, not an assumption. */
export interface Geometry {
  readonly width: number;
  readonly height: number;
}

/**
 * One rule applied to a set of cells.
 *
 * Cells are addressed by flat index — 0 to width × height - 1, left to right
 * then top to bottom — so a geometry with irregular regions needs no new
 * addressing scheme.
 */
export interface Constraint {
  readonly primitive: string;
  readonly cells: readonly number[];
}

export interface Ruleset {
  /** Permanent. It appears in stored progress, so reusing it would reinterpret saved boards. */
  readonly id: string;
  readonly name: string;
  readonly geometry: Geometry;
  /** The values a cell may hold. */
  readonly values: readonly number[];
  readonly constraints: readonly Constraint[];
}

/** One entry per cell; `null` where empty. */
export type Board = readonly (number | null)[];

/**
 * A primitive reports which of the cells it was given are in conflict.
 *
 * It says nothing about whether cells are *filled* — completion is the
 * evaluator's business, not any individual rule's.
 */
export type Primitive = (cells: readonly number[], board: Board) => readonly number[];

export interface Evaluation {
  readonly conflicts: ReadonlySet<number>;
  readonly complete: boolean;
}
