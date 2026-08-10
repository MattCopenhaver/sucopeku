import type { Ruleset } from '../../engine/types.js';

/**
 * Annotation kinds, by identifier.
 *
 * A kind is what a player can put in a cell that is not a value. This registry
 * holds their behaviour; `ui/annotations.ts` holds their appearance under the
 * same identifiers. Adding a fourth kind means one file in each and touching
 * neither of the others, which is the whole of FR-007 (003).
 *
 * Nothing here knows what Sudoku is, and nothing here can reach the board.
 * Annotations are never evaluated (003 FR-005).
 */

/** A set of values, or a single identifier. Enough for the three kinds shipped. */
export type Payload = readonly number[] | string;

export interface AnnotationKind<P extends Payload = Payload> {
  /** Permanent. It appears in stored progress, so reusing it reinterprets saved boards. */
  readonly id: string;
  /** Whether cells that came with the puzzle accept it (003 FR-006). */
  readonly acceptsGivens: boolean;
  empty(): P;
  isEmpty(payload: P): boolean;
  has(payload: P, input: number | string): boolean;
  add(payload: P, input: number | string): P;
  remove(payload: P, input: number | string): P;
  /** Reads a stored payload, dropping what is invalid rather than throwing. */
  parse(raw: unknown, ruleset: Ruleset): P | undefined;
}

const kinds = new Map<string, AnnotationKind>();

export function register(kind: AnnotationKind): void {
  kinds.set(kind.id, kind);
}

/** Undefined for an unknown id — a stored document naming a kind we do not have
 *  loses that data and keeps the rest, exactly as an unknown primitive does. */
export function kindFor(id: string): AnnotationKind | undefined {
  return kinds.get(id);
}

export function allKinds(): readonly AnnotationKind[] {
  return [...kinds.values()];
}
