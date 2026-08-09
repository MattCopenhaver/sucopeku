---

description: "Task list for feature 002: Playable Sudoku"
---

# Tasks: Playable Sudoku

**Input**: Design documents from `/specs/002-playable-sudoku/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included and are **not optional**. Constitution
Principle VIII requires that every test be something a player could do, and
feature 001's pipeline gates merging on the browser suite passing. No unit test tasks appear anywhere in this list, and none may
be added without a constitutional amendment — including for the constraint
evaluator, which is precisely the code that would ordinarily have them.

**Organization**: Grouped by user story so each is independently implementable and
testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in every task

## Path Conventions

Per plan.md: `site/src/engine/` is the ruleset-agnostic evaluator, `site/src/game/`
is state and persistence, `site/src/ui/` is rendering, and `site/src/rulesets/`
and `site/src/puzzles/` hold data. Tests live in `tests/e2e/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The data and types everything else consumes

- [ ] T001 [P] Define `Geometry`, `Constraint`, `Ruleset`, and `Board` types in `site/src/engine/types.ts` per data-model.md, addressing cells by flat index rather than row and column
- [ ] T002 Write the development-only generator in `scripts/build-classic-ruleset.ts` that emits the 27 all-different constraints for a 9×9 grid — nine rows, nine columns, nine boxes (research.md D2)
- [ ] T003 Run the generator and commit its output as `site/src/rulesets/classic-9x9.json`, matching contracts/ruleset.md. Nothing at runtime may import the generator (FR-005)
- [ ] T004 Add the 20 curated puzzles to `site/src/puzzles/curated.json` in the shape given by contracts/puzzle.md, with sparse `givens` keyed by flat index (FR-001)
- [ ] T005 Verify each of the 20 puzzles has exactly one solution using a tool outside this repository, and record the method and date in `curated.json`'s `verifiedUnique` field (FR-002, SC-002, research.md D3)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The constraint engine. Every user story reads from it

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. This is the feature's central cost — see plan.md's Constitution Check

- [ ] T006 Implement the primitive registry in `site/src/engine/primitives.ts`, with `all-different` as its only entry: given cells and a board, report every cell whose value another named cell also holds (contracts/ruleset.md)
- [ ] T007 Implement `evaluate(board, ruleset)` in `site/src/engine/evaluate.ts`, returning conflicting cell indices and whether the board is complete. Complete means every cell filled with no constraint violated — never comparison against a stored answer (FR-007)
- [ ] T008 Ensure nothing in `site/src/engine/` imports from `game/` or `ui/`, and that no file there mentions Sudoku, rows, columns, boxes, or the number nine. This is what makes FR-006 checkable by reading the imports
- [ ] T009 Handle an unknown `primitive` name in `site/src/engine/evaluate.ts` by skipping that constraint rather than throwing, so a data error cannot stop the site starting (contracts/ruleset.md)
- [ ] T010 [P] Load and validate the ruleset and puzzle data in `site/src/game/data.ts`, rejecting constraints whose cell indices fall outside the geometry (data-model.md)

**Checkpoint**: The engine exists and is ruleset-agnostic. User story work can begin.

---

## Phase 3: User Story 1 - Solve a Sudoku (Priority: P1) 🎯 MVP

**Goal**: A player can fill a grid and be told when it is solved.

**Independent Test**: Open the site, fill every empty cell correctly, and confirm the game recognises the puzzle as solved.

- [ ] T011 [US1] Build the board in `site/src/game/state.ts` by overlaying player entries onto the puzzle's givens, and expose which cells are given and therefore not writable (FR-004)
- [ ] T012 [US1] Hold interaction state in `site/src/game/state.ts` as a selected digit and a selected cell, with every input reducing to *select a digit* and *apply to a cell* (research.md D7)
- [ ] T013 [US1] Render the 9×9 grid from the board in `site/src/ui/grid.ts`, distinguishing given cells from the player's entries
- [ ] T014 [P] [US1] Render the number pad in `site/src/ui/pad.ts` with digits 1–9 and an erase key, always visible while a puzzle is shown (FR-009, FR-014)
- [ ] T015 [US1] Indicate the selected digit and the selected cell in `site/src/ui/pad.ts` and `site/src/ui/grid.ts` (FR-011, FR-016)
- [ ] T016 [US1] Apply a selected digit to a chosen cell in `site/src/game/state.ts`, leaving the digit selected so it can be placed repeatedly (FR-008, FR-010)
- [ ] T017 [US1] Implement erase in `site/src/game/state.ts`: while erase is selected, choosing a cell clears the player's value; choosing an empty cell does nothing and reports no error (FR-013, FR-014, FR-015)
- [ ] T018 [US1] Add keyboard handling in `site/src/ui/grid.ts` — arrows move the selected cell, typing a digit selects and places it, Backspace and Delete clear, per the table in research.md D7 (FR-012, FR-017)
- [ ] T019 [US1] Make the grid and pad usable by touch and pointer with the same handlers, so no action is reachable by only one input method (FR-017)
- [ ] T020 [US1] Show the puzzle as solved when `evaluate` reports complete with no conflicts, visibly enough that a person need not inspect cells (FR-022, SC-005)
- [ ] T021 [US1] Lock the grid while solved, and add the unlock control in `site/src/ui/controls.ts` that returns it to editing (FR-023, FR-024)
- [ ] T022 [US1] Clear the solved state when an unlocked puzzle stops being complete, and set it again if completed again (EC-007)
- [ ] T023 [US1] Ignore input that is not a digit 1–9, an erase, or a movement, without changing the grid or reporting an error (EC-001)
- [ ] T024 [US1] Replace a cell's existing value when a new digit is placed into it (EC-002)
- [ ] T025 [P] [US1] Style the grid and pad in `site/src/style.css` so both are usable at 320px width without horizontal scrolling (FR-018, EC-009, SC-008)
- [ ] T026 [P] [US1] Write `tests/e2e/play.spec.ts`: place a digit, place it again elsewhere, erase, confirm givens are not writable, solve the puzzle, confirm it locks, unlock and confirm editing resumes (SC-001)
- [ ] T027 [US1] Extend `tests/e2e/play.spec.ts` to perform the same sequence by keyboard alone and by touch alone, proving input parity (SC-003, quickstart Scenario 2)

**Checkpoint**: The game is playable end to end. This is the MVP — everything after it protects, marks, or persists this.

---

## Phase 4: User Story 2 - See mistakes as they happen (Priority: P2)

**Goal**: Conflicting values are marked as they are entered.

**Independent Test**: Enter two identical numbers in the same row; confirm both are marked, and that changing one clears the marking.

- [ ] T028 [US2] Mark the cells `evaluate` reports as conflicting in `site/src/ui/grid.ts`, re-evaluating after every change (FR-019, SC-004)
- [ ] T029 [US2] Clear the marking when a conflict is resolved (FR-020)
- [ ] T030 [P] [US2] Mark conflicts with both a colour change and a heavy underline in `site/src/style.css`, so they survive greyscale (FR-021, research.md D8)
- [ ] T031 [P] [US2] Write `tests/e2e/conflicts.spec.ts` covering a row conflict, a column conflict, a box conflict, and the marking clearing when resolved
- [ ] T032 [US2] Add a greyscale screenshot assertion to `tests/e2e/conflicts.spec.ts` proving a conflict is identifiable without colour (SC-009)

**Checkpoint**: The ruleset machinery is exercised through the interface, which is the only way Principle VIII permits verifying it.

---

## Phase 5: User Story 3 - Come back to a puzzle in progress (Priority: P3)

**Goal**: A puzzle in progress survives a reload, a closed browser, and a visit to another puzzle.

**Independent Test**: Fill several cells, reload, and confirm the entries are still present.

- [ ] T033 [US3] Implement load and save in `site/src/game/progress.ts` against one `localStorage` key holding a versioned document, per contracts/storage.md C2
- [ ] T034 [US3] Save after every change without any player action, recording entries, solved, unlocked, and `playedAt` (FR-025, FR-031, FR-032)
- [ ] T035 [US3] Restore progress for a puzzle when it loads, keyed by puzzle identifier so any route to a puzzle finds its own entries (FR-033)
- [ ] T036 [US3] Evict the least recently played puzzle beyond ten in `site/src/game/progress.ts` (FR-034)
- [ ] T037 [US3] Discard the whole stored document when its version is unrecognised, and start the player fresh rather than erroring (FR-035, EC-004)
- [ ] T038 [US3] Save by merging into the stored document as it currently stands, re-reading before each write, so a tab cannot erase a puzzle it never touched. Two writes in the same instant still resolve to one; the document must remain loadable (FR-037, EC-008, research.md D10)
- [ ] T039 [US3] Listen for the browser's `storage` event in `site/src/game/progress.ts` and reload and re-render the current puzzle when another tab changes it (FR-036, research.md D10)
- [ ] T040 [US3] Keep the puzzle fully playable when storage is denied or full, treating persistence as an enhancement rather than a prerequisite (EC-006)
- [ ] T041 [US3] Load a puzzle normally when stored entries conflict with its givens, showing the conflict rather than refusing to open (EC-005)
- [ ] T042 [US3] Give the player a working puzzle when stored progress names a puzzle that no longer exists (EC-003)
- [ ] T043 [P] [US3] Write `tests/e2e/progress.spec.ts`: fill cells, reload, confirm entries persist; solve, reload, confirm still solved and locked (SC-006)
- [ ] T044 [US3] Extend `tests/e2e/progress.spec.ts` with two browser contexts: entering a value in one tab appears in the other without reload, and a save in a tab showing a different puzzle leaves the first puzzle's progress intact (User Story 3, scenarios 6 and 7)

**Checkpoint**: Progress survives. Principle VI is honoured rather than deferred.

---

## Phase 6: User Story 4 - Play a different puzzle (Priority: P4)

**Goal**: Each puzzle has an address, and a player can move between puzzles.

**Independent Test**: Start a new puzzle, confirm it differs, then go back and confirm the previous puzzle's progress is intact.

- [ ] T045 [US4] Read the puzzle identifier from the query string in `site/src/main.ts` and load that puzzle (FR-026, FR-027, FR-030, contracts/storage.md C1)
- [ ] T046 [US4] Select the puzzle to show when none is named in `site/src/main.ts`: the most recently played unsolved puzzle, falling back to random when every puzzle with progress is solved or there is none (FR-003)
- [ ] T047 [US4] Replace the address with the selected puzzle's, so a reload does not reshuffle (FR-028)
- [ ] T048 [US4] Give the player a working puzzle when the address names an unknown or malformed identifier (FR-029, EC-010)
- [ ] T049 [US4] Add the new-puzzle control in `site/src/ui/controls.ts`, choosing a different puzzle at random and moving to its address (FR-038)
- [ ] T050 [US4] Prefer puzzles the player has not completed when choosing a new one, while unplayed puzzles remain (User Story 4, scenario 4)
- [ ] T051 [P] [US4] Write `tests/e2e/puzzles.spec.ts`: arriving at `/` yields an address, reloading keeps the same puzzle, the new-puzzle control changes it, the back button returns to the previous puzzle with its progress (SC-007)
- [ ] T052 [US4] Extend `tests/e2e/puzzles.spec.ts`: after leaving an unsolved puzzle, arriving at `/` resumes it; after solving every puzzle with progress, arriving at `/` gives a random one (User Story 1, scenarios 2 and 3)

**Checkpoint**: All four stories complete. The game is playable, forgiving, persistent, and navigable.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T053 Make the service worker's navigation fallback ignore the query string in `site/public/sw.js`, or offline works at `/` and fails at `/?puzzle=p07` (research.md D4, contracts/storage.md C1)
- [ ] T054 Validate quickstart Scenario 6 by hand on a real iOS device — load a puzzle, go offline, reload at a puzzle address. Playwright cannot drive WebKit service workers, so this is unreachable by the suite
- [ ] T055 Validate quickstart Scenario 7 by hand: disable storage for the site and confirm the puzzle remains playable
- [ ] T056 Update `specs/002-playable-sudoku/plan.md` and this file if anything built diverged from what was planned
- [ ] T057 Write the human-authored `## SDD Notes` section in this feature's pull request body, including whether a defect reached `main` that a unit test would have caught — the result Principle VIII asks be reported

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T005 gates nothing technically but must be done before merge, since FR-002 is a promise about shipped data
- **Foundational (Phase 2)**: Depends on Setup. **Blocks every user story** — T007's `evaluate` is read by US1 for completion, US2 for conflicts, and US3 for the solved flag
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational and on US1's grid rendering
- **US3 (Phase 5)**: Depends on US1 for something to persist. Independent of US2
- **US4 (Phase 6)**: Depends on US1. Most valuable after US3, since addresses are how a player returns to saved progress
- **Polish (Phase 7)**: T048 can be done any time and should be done before US4 is validated offline

### Parallel Opportunities

- T001 and T002 — types and the generator touch different files
- T014, T025, T026 — pad markup, styling, and a test file are unrelated
- T030 and T031 — conflict styling and the conflict test
- T041 and T047 — different test files, different stories
- Across stories: US3 and US4 touch `game/progress.ts` and `main.ts` respectively and could proceed together once US1 lands

---

## Parallel Example: Phase 1

```bash
# Types and the ruleset generator are independent:
Task: "Define Geometry, Constraint, Ruleset, and Board types in site/src/engine/types.ts"
Task: "Write the development-only generator in scripts/build-classic-ruleset.ts"
```

## Parallel Example: User Story 1

```bash
# Markup, styling, and tests touch different files:
Task: "Render the number pad in site/src/ui/pad.ts"
Task: "Style the grid and pad in site/src/style.css for 320px"
Task: "Write tests/e2e/play.spec.ts"
```

---

## Implementation Strategy

### MVP First (Phases 1–3)

1. Data and types
2. The constraint engine
3. US1 — a playable, solvable Sudoku

Stop there and play it. That is the first time this project does the thing it exists to do.

### Incremental Delivery

| Increment | Delivers |
|---|---|
| Setup + Foundational | Nothing visible. The engine everything else reads |
| + US1 | A playable Sudoku. **MVP** |
| + US2 | Mistakes visible as they happen |
| + US3 | Progress survives leaving |
| + US4 | Addresses, and moving between puzzles |

### Note on the engine

Phase 2 is four tasks and will take longer than its size suggests. It is the
feature's central cost, and it delivers nothing a player can see — classic Sudoku
would be a fraction of the work implemented directly. That trade was made when
the constitution was ratified; T008 is what keeps it honest.

---

## Notes

- No unit test tasks appear here, by constitutional principle rather than oversight
- Every test task drives a real browser and asserts what a person would see
- T008 is a constraint, not a deliverable: it is checked by reading imports
- Commit after each task or logical group; the pull request is squash-merged
