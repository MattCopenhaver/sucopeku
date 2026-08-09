import { evaluate } from '../engine/evaluate.js';
import type { Board, Evaluation, Ruleset } from '../engine/types.js';
import { givenCells, type Puzzle } from './data.js';
import { load, save, type PuzzleProgress } from './progress.js';

/**
 * The playing state.
 *
 * Interaction is cell-first: every input reduces to *move the selection* and
 * *place into it* (research.md D7). The pad and the keyboard call `place` with
 * the same argument, so there is no second path that could drift from the
 * first — which is what keeps input parity checkable rather than aspirational.
 */

/** What the pad and the keyboard can place. */
export type Entry = number | 'erase';

export class Game {
  readonly puzzle: Puzzle;
  readonly ruleset: Ruleset;
  readonly givens: ReadonlySet<number>;
  readonly cellCount: number;

  private entries: Record<string, number>;
  private solvedFlag: boolean;
  private unlocked: boolean;

  selectedCell: number | null = null;

  constructor(puzzle: Puzzle, ruleset: Ruleset) {
    this.puzzle = puzzle;
    this.ruleset = ruleset;
    this.givens = givenCells(puzzle);
    this.cellCount = ruleset.geometry.width * ruleset.geometry.height;

    const stored = load(puzzle.id);
    this.entries = { ...(stored?.entries ?? {}) };
    this.solvedFlag = stored?.solved ?? false;
    this.unlocked = stored?.unlocked ?? false;

    // Start somewhere. Safari leaves buttons out of the tab order unless the
    // player has turned on full keyboard access, so arriving with nothing
    // selected leaves a keyboard player with no way into the grid at all. A
    // visible starting cell also satisfies FR-016 from the first frame.
    this.selectedCell = this.firstWritable();
  }

  private firstWritable(): number {
    for (let cell = 0; cell < this.cellCount; cell += 1) {
      if (!this.givens.has(cell)) return cell;
    }
    return 0;
  }

  /** Givens overlaid with the player's entries (data-model.md). */
  get board(): Board {
    const board: (number | null)[] = new Array<number | null>(this.cellCount).fill(null);
    for (const [cell, value] of Object.entries(this.puzzle.givens)) board[Number(cell)] = value;
    for (const [cell, value] of Object.entries(this.entries)) board[Number(cell)] = value;
    return board;
  }

  get evaluation(): Evaluation {
    return evaluate(this.board, this.ruleset);
  }

  get solved(): boolean {
    return this.solvedFlag;
  }

  /** While solved and not unlocked, nothing can be entered or erased (FR-023). */
  get locked(): boolean {
    return this.solvedFlag && !this.unlocked;
  }

  isGiven(cell: number): boolean {
    return this.givens.has(cell);
  }

  selectCell(cell: number): void {
    if (cell >= 0 && cell < this.cellCount) this.selectedCell = cell;
  }

  /**
   * Places an entry into the selected cell, which stays selected so a value can
   * be corrected without reselecting it (FR-010).
   *
   * This is the only way a value ever changes. The pad, a typed digit, and
   * Backspace all arrive here, which is what makes FR-012 true in the code
   * rather than only in the wording.
   */
  place(entry: Entry): void {
    const cell = this.selectedCell;
    if (cell === null) return;
    if (this.locked) return;
    if (this.isGiven(cell)) return;

    if (entry === 'erase') {
      // Erasing an empty cell does nothing and reports no error (FR-015).
      delete this.entries[String(cell)];
    } else {
      this.entries[String(cell)] = entry;
    }

    this.refreshSolved();
    this.persist();
  }

  unlock(): void {
    if (!this.solvedFlag) return;
    this.unlocked = true;
    this.persist();
  }

  /**
   * Reloads from storage, for when another tab has changed it (FR-036).
   * Interaction state is deliberately untouched: the player's selected digit
   * should not jump because a change arrived from elsewhere.
   */
  reloadFromStorage(): void {
    const stored = load(this.puzzle.id);
    this.entries = { ...(stored?.entries ?? {}) };
    this.solvedFlag = stored?.solved ?? false;
    this.unlocked = stored?.unlocked ?? false;
  }

  /**
   * A solved board that stops being complete stops being solved, and becomes
   * solved again if completed again (EC-007).
   */
  private refreshSolved(): void {
    const complete = this.evaluation.complete;
    if (complete) {
      this.solvedFlag = true;
      this.unlocked = false;
    } else if (this.solvedFlag) {
      this.solvedFlag = false;
      this.unlocked = false;
    }
  }

  private persist(): void {
    const progress: PuzzleProgress = {
      entries: { ...this.entries },
      solved: this.solvedFlag,
      unlocked: this.unlocked,
      playedAt: Date.now(),
    };
    save(this.puzzle.id, progress);
  }

  /** Records that this puzzle was opened, so FR-003 can find it later. */
  touch(): void {
    this.persist();
  }
}
