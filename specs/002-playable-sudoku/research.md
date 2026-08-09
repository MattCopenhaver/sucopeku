# Phase 0 Research: Playable Sudoku

**Feature**: 002-playable-sudoku
**Date**: 2026-08-09

Each decision resolves an unknown in the plan's Technical Context. D1 is the one
everything else rests on.

---

## D1. The constraint engine: three layers, only one of them code

**Decision**: Split the engine into primitives, rulesets, and an evaluator.

```
Primitive   code, rare      "all-different over a set of cells"
Ruleset     data, free      classic = all-different × 27 cell sets
Evaluator   code, generic   applies whatever primitives a ruleset names
```

Shapes:

```
Geometry   { width, height }                      — not fixed at 9×9
Constraint { primitive: string, cells: number[] } — cell indices, not coordinates
Ruleset    { id, geometry, values, constraints[] }
Board      (number | null)[]                      — one entry per cell
```

The evaluator's whole interface is:

```
evaluate(board, ruleset) → { conflicts: Set<index>, complete: boolean }
```

It iterates the ruleset's constraints, looks each `primitive` up in a registry,
and unions the conflicting cells each reports. It contains no reference to rows,
columns, boxes, or the number nine.

**Rationale**: FR-005 and FR-006 require exactly this, and Principle III requires
adding a ruleset to be additive. Constraints address cells by flat index rather
than row/column so that geometries which are not rectangular grids — jigsaw
regions, irregular boards — need no new addressing scheme later.

`complete` is computed as *every cell filled and no conflicts*, per FR-007. The
engine never holds a solution, which is why FR-002's uniqueness has to be
established before shipping rather than checked at runtime.

**Alternatives considered**:

| Alternative | Rejected because |
|---|---|
| A `SudokuValidator` with row/column/box methods | The obvious implementation, and a direct violation of FR-006. Every variant would then edit it |
| Constraints as predicate functions rather than data | Expressive, but a ruleset becomes code — Principle III explicitly forbids that, and functions cannot be shipped as a JSON file a future authoring UI could write |
| A general constraint-solver library | Far more than a conflict check needs, and a dependency that would have to be justified under Principle II |

---

## D2. Classic Sudoku ships as a committed data file

**Decision**: `site/src/rulesets/classic-9x9.json` holds the 27 all-different
constraints literally. A small development script generates it; the file is
committed and the runtime reads only the file.

**Rationale**: Principle III says adding a ruleset must be possible without
writing code. If classic Sudoku were produced at runtime by a `buildSudoku()`
helper, the helper would be code that knows about rows, columns, and boxes —
precisely the knowledge FR-006 removes from the evaluator, reintroduced one layer
up. Committing the generated data keeps the runtime path pure data.

The generator is a convenience for authoring 243 indices without transcription
errors, not a dependency. Nothing at runtime imports it, and a future variant
could be hand-written or produced by a UI instead.

**Alternatives considered**: hand-writing the JSON (identical result, far more
error-prone); generating at startup (puts ruleset knowledge back into code);
generating at build time (a build step that hides what ships, for no gain over a
committed file).

---

## D3. Puzzles ship as data with stable identifiers

**Decision**: `site/src/puzzles/curated.json` holds 20 entries:

```
{ id: "p01", ruleset: "classic-9x9", givens: { "0": 5, "4": 7, ... } }
```

Identifiers are opaque and permanent (`p01`…`p20`). Givens are a sparse map from
cell index to value, so a puzzle is described by what it fixes rather than by 81
slots most of which are empty.

**Rationale**: FR-017 requires identifiers stable across releases because they
appear in addresses, and FR-026 makes those addresses versioned data. Sequential
opaque ids avoid encoding anything — difficulty, ordering, authorship — that
would later need to change.

**Uniqueness (FR-002)**: each puzzle is verified to have exactly one solution
before it ships, outside this repository, and the file records how and when. No
solver exists in this feature; per the clarification, one-time verification of
fixed data is evidence rather than a standing promise. A future generation
feature will bring a solver and can re-verify the set at that point.

---

## D4. Addressing by query parameter

**Decision**: `/?puzzle=p07`. Arriving with no parameter picks one at random and
replaces the URL with that puzzle's address.

**Rationale**: The site is static objects behind a CDN. A path-based address
(`/p/p07/`) would need either an object per puzzle or origin routing, both of
which add deployment machinery for no player-visible gain. A query parameter is
served by the same single `index.html` the site already deploys.

It also interacts correctly with offline (Principle IV). The service worker
serves navigations network-first with a cache fallback; because every puzzle
address returns the same document, an offline visitor to `/?puzzle=p07` can be
served the cached root. **This requires the worker's fallback lookup to ignore
the query string** — a one-line change to `site/public/sw.js`, noted here because
it is easy to miss and fails only offline.

**Alternatives considered**: a path per puzzle (deployment cost, and 20 more
objects to keep in step); a hash fragment (`#p07` — never sent to the server,
fine here, but conventionally means a location *within* a document rather than
which document); no address at all (rejected during clarification).

---

## D5. Progress: one versioned document in local storage

**Decision**: A single `localStorage` key, `sucopeku.progress`, holding:

```
{ v: 1, puzzles: { "p07": { entries: {...}, solved: bool, unlocked: bool, playedAt: epoch } } }
```

**Rationale**: FR-027 to FR-029 require per-puzzle progress capped at ten with
least-recently-played eviction. Eviction needs to compare puzzles, so holding one
document makes the cap a simple sort rather than a scan of many keys. `playedAt`
is what the cap orders by.

`v` satisfies FR-026. Before 1.0 the format may break (constitution 3.0.0), so a
document whose `v` is unrecognised is discarded wholesale and the player gets a
fresh puzzle — which is EC-004's required behaviour, reached by the simplest
possible path.

**Alternatives considered**: a key per puzzle (eviction requires enumerating and
parsing every key); IndexedDB (asynchronous, far more machinery than a few
kilobytes of JSON needs, and Principle II asks for the least that satisfies the
requirement); session storage (loses progress on tab close, violating FR-022).

---

## D6. No framework

**Decision**: Plain TypeScript against the DOM. No UI library.

**Rationale**: The interface is an 81-cell grid, a 10-key pad, and two controls.
State is a board array, a selected digit, and a selected cell. Principle II asks
for the least machinery that satisfies the spec, and a framework would be a
runtime dependency justified by nothing here.

The honest cost: re-rendering and event wiring are hand-written, and if the site
later grows modes, variants, and pencil marks, this decision deserves revisiting.
Recorded so that revisiting it is a decision rather than a rescue.

---

## D7. Input as a small state machine

**Decision**: Interaction state is `{ selectedDigit: 1..9 | 'erase', selectedCell:
index | null }`. Every input path reduces to the same two operations: *select a
digit* and *apply to a cell*.

| Input | Path |
|---|---|
| Tap or click a pad key | select digit |
| Tap or click a cell | apply to that cell |
| Arrow keys | move selected cell |
| Type 1–9 | select that digit, then apply to the selected cell |
| Backspace or Delete | select erase, then apply to the selected cell |
| Enter or Space | apply the selected digit to the selected cell |

**Rationale**: FR-010 makes entry digit-first and FR-012 makes typing a shortcut
over the same model rather than a second one. Expressing every input as the same
two operations is what makes that true in the code rather than only in the
specification, and it is why Principle IX's parity requirement can be checked by
reading this table.

---

## D8. Conflicts marked by more than colour

**Decision**: A conflicting cell gets a colour change **and** a visible marker
that survives greyscale — a heavy underline beneath the digit.

**Rationale**: FR-021 and SC-008 require conflicts to be identifiable without
colour, and SC-008 is checkable by taking a greyscale screenshot. Red-on-white
alone is the standard failure; an underline costs nothing and is legible at
320px, where an icon or badge would crowd a cell.

Principle IX's accessibility posture supports accommodations that are free at
design time. This one is.

---

## D9. Testing approach

**Decision**: Playwright only, driving the site as a player. No unit tests, per
Principle VIII. The evaluator is exercised through the board, not called
directly.

**Rationale**: This is the feature where the no-unit-test experiment gets its
first real test. The constraint engine is the kind of pure, branchy logic unit
tests exist for, and Principle VIII says it must be verified by placing digits in
a grid and observing what the page shows.

**Recorded for the experiment**: if a defect reaches `main` here that a unit test
would obviously have caught, that is the result the constitution asks be reported
rather than quietly patched by adding one.

---

## D10. Cross-tab synchronisation

**Decision**: Two mechanisms, both small.

- **Merge on write.** Before saving, re-read the stored document and apply this
  puzzle's change to it, rather than writing back the copy held in memory.
- **Listen for `storage`.** The browser fires that event in every *other* tab
  when the key changes. On hearing it, a tab reloads its puzzle's progress and
  re-renders.

**Rationale**: FR-037 needs the first, FR-036 the second, and they solve different
halves. Merging stops a tab's save from erasing puzzles it never touched — the
consequence of holding every puzzle in one document (D5). The listener is what
makes a change in one tab visible in another, which merging alone does not do.

**On the cost of re-reading before every write**: negligible here, and worth
stating why rather than asserting it. The document is a few kilobytes — twenty
puzzles of eighty-one cells — reads are synchronous, and writes happen at human
speed. This would deserve reconsideration if the document grew substantially,
which pencil marks across twenty puzzles could eventually do.

**Accepted consequence**: two tabs on the *same* puzzle can no longer be used as
independent scratchpads — typing in one changes the other. That is inherent to
synchronising rather than a defect, and the alternative (tabs silently diverging
until one overwrites the other) is worse.

**Residual, and deliberately not solved**: two writes in the same instant still
resolve to one. EC-008 requires only that the result stay loadable, which
last-write-wins satisfies. Closing that window properly would need locking or a
change log, which is far more machinery than a single-player puzzle site warrants.
