import { evaluate } from '../engine/evaluate.js';
import type { Board, Evaluation, Ruleset } from '../engine/types.js';
import { allKinds, kindFor, type Payload } from './annotations/registry.js';
import { CENTRE, CORNER } from './annotations/marks.js';
import { COLOUR } from './annotations/colour.js';
import { givenCells, type Puzzle } from './data.js';
import type { PaletteId } from './palettes.js';
import { load, save, type PuzzleProgress, type StoredAnnotations } from './progress.js';

/**
 * The playing state.
 *
 * Interaction is cell-first: every input reduces to *move the selection* and
 * *place into it* (002 research.md D7). The pad and the keyboard call `place`
 * with the same argument, so there is no second path that could drift from the
 * first — which is what keeps input parity checkable rather than aspirational.
 *
 * Feature 003 turns the selection into a *set* and adds a mode. Interaction
 * state was one field and is now four; 003 research.md D2 records why that was
 * worth spending.
 */

/** What the pad and the keyboard can place. */
export type Entry = number | 'erase';

/** Which kind of thing a digit press places (003 FR-008). */
export type Mode = 'value' | typeof CENTRE | typeof CORNER | typeof COLOUR;

/** Erase walks these layers in order, choosing one for the whole selection. */
const ERASE_LAYERS: readonly (readonly string[])[] = [[CENTRE, CORNER], [COLOUR]];

export class Game {
  readonly puzzle: Puzzle;
  readonly ruleset: Ruleset;
  readonly givens: ReadonlySet<number>;
  readonly cellCount: number;

  private entries: Record<string, number>;
  private annotations: StoredAnnotations;
  private solvedFlag: boolean;
  private unlocked: boolean;

  /** The cells the next placement applies to (003 FR-014). */
  selection = new Set<number>();
  /** Where a shift-extended range grows *from*. Fixed while extending (003 D2). */
  anchor: number | null = null;
  /**
   * Where the keyboard currently is. Distinct from the anchor: a range needs a
   * fixed end and a moving one, and using the anchor for both means the second
   * shift+arrow recomputes the same range and the selection never grows.
   */
  cursor: number | null = null;
  mode: Mode = 'value';
  palette: PaletteId = 'light';

  constructor(puzzle: Puzzle, ruleset: Ruleset) {
    this.puzzle = puzzle;
    this.ruleset = ruleset;
    this.givens = givenCells(puzzle);
    this.cellCount = ruleset.geometry.width * ruleset.geometry.height;

    const stored = load(puzzle.id);
    this.entries = { ...(stored?.entries ?? {}) };
    this.annotations = parseAnnotations(stored?.annotations, ruleset);
    this.solvedFlag = stored?.solved ?? false;
    this.unlocked = stored?.unlocked ?? false;

    // Start somewhere. Safari leaves buttons out of the tab order unless the
    // player has turned on full keyboard access, so arriving with nothing
    // selected leaves a keyboard player with no way into the grid at all. A
    // visible starting cell also satisfies 002 FR-016 from the first frame.
    //
    // Mode, palette, and selection are all working state and none is restored
    // (003 FR-013, FR-020, FR-043, EC-006).
    this.selectOnly(this.firstWritable());
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

  /** The one cell acted on when exactly one is selected, else null. */
  get selectedCell(): number | null {
    return this.selection.size === 1 ? [...this.selection][0]! : null;
  }

  private inRange(cell: number): boolean {
    return Number.isInteger(cell) && cell >= 0 && cell < this.cellCount;
  }

  /** Replace the selection with one cell — a plain click or arrow (003 FR-015). */
  selectOnly(cell: number): void {
    if (!this.inRange(cell)) return;
    this.selection = new Set([cell]);
    this.anchor = cell;
    this.cursor = cell;
  }

  /** Add one cell without discarding the rest — a modified click (003 FR-017). */
  addToSelection(cell: number): void {
    if (!this.inRange(cell)) return;
    this.selection.add(cell);
    this.anchor = cell;
    this.cursor = cell;
  }

  /** Extend from the anchor, leaving it put so the range does not drift (003 FR-018). */
  extendTo(cell: number): void {
    if (!this.inRange(cell)) return;
    this.cursor = cell;
    const from = this.anchor ?? cell;
    const width = this.ruleset.geometry.width;
    const [r1, r2] = [Math.floor(from / width), Math.floor(cell / width)].sort((a, b) => a - b);
    const [c1, c2] = [from % width, cell % width].sort((a, b) => a - b);
    const next = new Set<number>();
    for (let row = r1!; row <= r2!; row += 1) {
      for (let col = c1!; col <= c2!; col += 1) next.add(row * width + col);
    }
    this.selection = next;
  }

  /** Kept for the drag path, which accumulates cells as the pointer passes. */
  selectCell(cell: number): void {
    this.selectOnly(cell);
  }

  /**
   * Places into every selected cell (003 FR-021), routed by the current mode.
   *
   * The selection survives, or FR-022's press-again-to-remove would be
   * unreachable (003 FR-044).
   */
  place(entry: Entry): void {
    if (this.locked) return; // 003 FR-039, EC-004
    if (entry === 'erase') {
      this.erase();
      return;
    }
    if (this.mode === 'value') this.placeValue(entry);
    else this.placeAnnotation(this.mode, entry);
  }

  /** Applies a colour by palette entry identifier rather than by digit. */
  placeColour(entryId: string): void {
    if (this.locked) return;
    this.placeAnnotation(COLOUR, entryId);
  }

  private placeValue(value: number): void {
    const targets = this.writableSelection();
    if (targets.length === 0) return; // silent, not an error (003 FR-026)
    for (const cell of targets) this.entries[String(cell)] = value;
    this.after();
  }

  /**
   * One rule for every kind: add unless every writable selected cell already
   * carries it, then remove from all (003 FR-022). Deciding once across the
   * selection is what keeps a press to a single nameable effect.
   */
  private placeAnnotation(kindId: string, input: number | string): void {
    const kind = kindFor(kindId);
    if (!kind) return;

    const eligible = [...this.selection].filter(
      (cell) => kind.acceptsGivens || !this.isGiven(cell),
    );
    if (eligible.length === 0) return;

    const bag = (this.annotations[kindId] ??= {});
    const allHaveIt = eligible.every((cell) =>
      kind.has((bag[String(cell)] as Payload) ?? kind.empty(), input),
    );

    for (const cell of eligible) {
      const current = (bag[String(cell)] as Payload) ?? kind.empty();
      const next = allHaveIt ? kind.remove(current, input) : kind.add(current, input);
      if (kind.isEmpty(next)) delete bag[String(cell)];
      else bag[String(cell)] = next;
    }
    this.after();
  }

  /**
   * Erase walks layers — value, then both mark kinds together, then colour —
   * choosing the layer once for the whole selection and ignoring the mode
   * (003 FR-025, FR-041). Emptying a cell entirely therefore takes three
   * presses and no mode switching.
   */
  erase(): void {
    if (this.locked) return;
    const cells = [...this.selection];
    if (cells.length === 0) return;

    const writable = cells.filter((cell) => !this.isGiven(cell));
    if (writable.some((cell) => this.entries[String(cell)] !== undefined)) {
      for (const cell of writable) delete this.entries[String(cell)];
      this.after();
      return;
    }

    for (const layer of ERASE_LAYERS) {
      const present = layer.some((kindId) =>
        cells.some((cell) => this.annotations[kindId]?.[String(cell)] !== undefined),
      );
      if (!present) continue;
      for (const kindId of layer) {
        const bag = this.annotations[kindId];
        if (!bag) continue;
        for (const cell of cells) delete bag[String(cell)];
      }
      this.after();
      return;
    }
    // Nothing to clear anywhere. Silent (003 FR-026).
  }

  /** Cells a value or a mark may be written to (003 FR-006, EC-001). */
  private writableSelection(): number[] {
    return [...this.selection].filter((cell) => !this.isGiven(cell));
  }

  /** What a cell carries of a kind, or its empty payload. */
  annotation(kindId: string, cell: number): Payload {
    const kind = kindFor(kindId);
    if (!kind) return [];
    return (this.annotations[kindId]?.[String(cell)] as Payload) ?? kind.empty();
  }

  private after(): void {
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
    this.annotations = parseAnnotations(stored?.annotations, this.ruleset);
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
      annotations: this.annotations,
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

/**
 * Reads stored annotations, dropping what this release cannot make sense of.
 *
 * An unknown kind, or a payload naming values the ruleset does not have, is
 * discarded and the rest is kept. A defect in stored data must not stop the
 * site starting — the same reasoning as an unknown primitive in a ruleset.
 */
function parseAnnotations(raw: StoredAnnotations | undefined, ruleset: Ruleset): StoredAnnotations {
  const out: StoredAnnotations = {};
  if (!raw || typeof raw !== 'object') return out;

  for (const kind of allKinds()) {
    const bag = raw[kind.id];
    if (!bag || typeof bag !== 'object') continue;
    const parsed: Record<string, unknown> = {};
    for (const [cell, payload] of Object.entries(bag)) {
      const value = kind.parse(payload, ruleset);
      if (value !== undefined) parsed[cell] = value;
    }
    if (Object.keys(parsed).length > 0) out[kind.id] = parsed;
  }
  return out;
}
