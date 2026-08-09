# Implementation Plan: Playable Sudoku

**Branch**: `002-playable-sudoku` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-playable-sudoku/spec.md`

## Summary

A playable Sudoku over 20 curated puzzles, each at its own address.

The load-bearing decision is the constraint engine. Classic Sudoku is a **data
file** — 27 all-different constraints over sets of cell indices — consumed by an
evaluator that has never heard of rows, columns, boxes, or the number nine. That
is the whole reason variants will later be free, and it is the entire cost of
this feature being harder than "draw a grid."

Everything else is small: a board array, a digit-first input state machine, one
versioned document in local storage, and plain DOM rendering with no framework.

## Technical Context

**Language/Version**: TypeScript 5.x, targeting current evergreen browsers

**Primary Dependencies**: None added. Vite and Playwright already exist from
feature 001

**Storage**: `localStorage`, one versioned JSON document. No backend — Principle IV

**Testing**: Playwright, browser-driven only. No unit test framework — Principle VIII

**Target Platform**: Desktop and mobile browsers. WebKit is the practical floor,
since every iOS browser uses it and Principle IX makes mobile first-class

**Project Type**: Static web application, extending the site built by feature 001

**Performance Goals**: None specified. Nothing here generates or solves, so
Principle VII stays dormant. Conflict evaluation runs over 27 constraints on
every entry — trivially fast, and not worth a target

**Constraints**: Ruleset expressed as data, evaluator ruleset-agnostic (FR-005,
FR-006). Input parity across keyboard, pointer, and touch (FR-017). Usable at
320px (FR-018). Progress versioned and capped at 10 (FR-026 to FR-029)

**Scale/Scope**: 20 puzzles, 81 cells, one ruleset, one player, one device

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Every Change Traces to a Spec | **Pass** | Implements spec 002; clarified before planning |
| II. Exactly One Solution | **Pass, by prior verification** | FR-002. Each curated puzzle is verified to have exactly one solution before shipping, outside this repository, with the method recorded beside the data. No solver is built here — see D3 |
| III. Rulesets Are Additive | **Pass — this is the feature's central cost** | Classic ships as data (D2); the evaluator resolves primitives from a registry and knows nothing of Sudoku (D1); geometry is a parameter, not the constant 9 |
| IV. No Backend, Works Offline | **Pass** | Static assets and `localStorage` only. One follow-on: the service worker's navigation fallback must ignore query strings, or offline breaks for any address carrying `?puzzle=` (D4) |
| V. Links and Saved State Never Break | **Pass under 3.0.0** | Both the address and the stored document carry version identifiers. Before 1.0 they may break provided failure is graceful, which EC-004 and EC-010 require |
| VI. Progress Persists Locally | **Pass** | Automatic, per puzzle, capped at ten with least-recently-played eviction (D5) |
| VII. Generation Stays Responsive | **Dormant** | Nothing generates. The principle's subject does not exist in this feature |
| VIII. Every Test Is Something a Player Could Do | **Pass, and under real strain** | The constraint engine is exactly the code unit tests exist for, and will be verified only by placing digits in a grid. This is the experiment's first genuine test — see D9 |
| IX. Playable by Keyboard, Mouse, and Touch | **Pass** | Every input reduces to *select a digit* and *apply to a cell*, reachable three ways (D7). Conflicts marked by more than colour (D8) |
| Scope and Technology Bounds | **Pass** | English only; no dependency added; nothing precludes curated libraries, authored puzzles, or player-defined rulesets — the ruleset format is already the data such a feature would write |

### No violations requiring justification

The one thing worth naming is not a violation but a cost: **Principle III makes
this feature roughly twice the work of a hardcoded Sudoku**, and delivers no
visible benefit until the second ruleset exists. That trade was made deliberately
when the constitution was ratified, and this is the feature that pays for it.

## Project Structure

### Documentation (this feature)

```text
specs/002-playable-sudoku/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — D1 through D9
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── ruleset.md       # The format a ruleset is expressed in
│   ├── puzzle.md        # The format a curated puzzle is expressed in
│   └── storage.md       # Stored progress and the address
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
site/
├── index.html               # Gains the grid, the pad, and the controls
├── public/
│   └── sw.js                # One change: fallback ignores the query string
└── src/
    ├── main.ts              # Wiring: read address, load, render, listen
    ├── style.css
    ├── engine/
    │   ├── primitives.ts    # The registry. all-different is the only entry
    │   ├── evaluate.ts      # evaluate(board, ruleset) → conflicts, complete
    │   └── types.ts         # Geometry, Constraint, Ruleset, Board
    ├── rulesets/
    │   └── classic-9x9.json # Data. 27 constraints, generated once, committed
    ├── puzzles/
    │   └── curated.json     # Data. 20 puzzles, uniqueness verified before ship
    ├── game/
    │   ├── state.ts         # Selected digit, selected cell, board, solved
    │   └── progress.ts      # Load, save, evict, version check
    └── ui/
        ├── grid.ts          # Render cells, mark conflicts, handle selection
        ├── pad.ts           # Digits 1-9 plus erase
        └── controls.ts      # New puzzle, unlock

scripts/
└── build-classic-ruleset.ts # Development only. Emits the JSON above.
                             # Nothing at runtime imports it

tests/e2e/
├── play.spec.ts             # US1 — enter, clear, solve
├── conflicts.spec.ts        # US2 — marking and clearing
├── progress.spec.ts         # US3 — reload, return, per-puzzle
└── puzzles.spec.ts          # US4 — new puzzle, back button
```

**Structure Decision**: `engine/` is separated from `game/` and `ui/` because the
engine is the part Principle III protects. Nothing in `engine/` may import from
`game/` or `ui/`, and nothing in it may mention Sudoku by name — a rule that can
be checked by reading the imports, which is what makes FR-006 enforceable rather
than aspirational.

`rulesets/` and `puzzles/` hold `.json` rather than `.ts` deliberately: it makes
"this is data" visible at a glance, and it is the format a future authoring
interface would produce.

## Deferred Decisions

Recorded so they are choices rather than oversights:

- **Pencil marks.** Out of scope, but the digit-first model was chosen partly to
  accommodate them. Nothing here should make them harder.
- **A second ruleset.** None exists, so the engine's genericity is unproven by
  use. The first variant is the real test of D1, and may expose a primitive the
  registry needs.
- **Difficulty.** Curated puzzles may vary; nothing labels or orders by it.
- **Revisiting "no framework" (D6).** Fine for a grid and a pad. If modes,
  variants, and pencil marks arrive, this deserves a fresh look rather than
  accumulating hand-written rendering.

## Complexity Tracking

> No constitution violations requiring justification.
