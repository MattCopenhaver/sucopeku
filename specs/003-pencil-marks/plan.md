# Implementation Plan: Pencil Marks and Multi-Cell Selection

**Branch**: `003-pencil-marks` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-pencil-marks/spec.md`

## Summary

A player can annotate cells without committing to a value, and can act on many
cells at once.

The load-bearing change is not pencil marks. It is that **selection stops being
a cell and becomes a set** — a field every part of the UI reads, replaced. Marks
and colours are then almost incidental: three entries in a registry, each with a
renderer.

The second decision worth naming up front is that annotation kinds are a
registry rather than three fields, because the player has said more kinds will
arrive. That is the same bet Principle III makes about rulesets, applied one
level up.

## Technical Context

**Language/Version**: TypeScript 5.x, targeting current evergreen browsers

**Primary Dependencies**: None added

**Storage**: `localStorage`. Progress moves to version 2; a separate key holds
the theme preference. No backend — Principle IV

**Testing**: Playwright, browser-driven only. No unit test framework — Principle VIII

**Target Platform**: Desktop and mobile browsers. WebKit is the practical floor.
Feature 002 found three defects that appeared only there, so it is treated as a
first-class target rather than a final check

**Project Type**: Static web application, extending features 001 and 002

**Performance Goals**: None specified. Nothing here generates or solves.
Selecting all 81 cells and placing a mark is the largest operation and is
trivially small; EC-010 asserts responsiveness rather than a number

**Constraints**: Input parity across keyboard, pointer, and touch, now including
a drag gesture (FR-010, FR-016, SC-003, SC-007). Annotations never reach the
board (FR-005). A fourth kind must not disturb the first three (FR-007). Usable
at 320px (FR-030)

**Scale/Scope**: 81 cells, 3 annotation kinds, 18 colours, 2 themes, 1 player

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Every Change Traces to a Spec | **Pass** | Specified and clarified before planning; four questions answered and recorded |
| II. Exactly One Solution | **Not engaged** | No puzzle is created or altered. Annotations are the player's notes and cannot change what solves the grid |
| III. Rulesets Are Additive | **Pass, and extended** | Mark digits come from `ruleset.values`, not a hardcoded nine, so a 4x4 ruleset gets four marks free. D1 applies the same registry pattern to annotation kinds |
| IV. No Backend, Works Offline | **Pass** | Two `localStorage` keys and static assets. Nothing new is fetched |
| V. Links and Saved State Never Break | **Pass under 3.0.0** | Progress moves to version 2 and version 1 is discarded gracefully, which 3.0.0 permits before 1.0 and the player chose knowingly. Addresses are untouched — annotations are not in the URL |
| VI. Progress Persists Locally | **Pass** | Annotations save automatically, restore per puzzle, and degrade to session-only when storage is refused (FR-035, FR-036, FR-038) |
| VII. Generation Stays Responsive | **Dormant** | Nothing generates |
| VIII. Every Test Is Something a Player Could Do | **Pass, with one honest gap** | Every scenario is a person using a grid. The exception is named in D8: Playwright can drive the touch drag but cannot reliably report whether the page also scrolled, so half of SC-007 is manual |
| IX. Playable by Keyboard, Mouse, and Touch | **Pass — the hardest part of this feature** | A drag gesture is the first interaction that is not a discrete press. D3 puts all three input types through one Pointer Events path for exactly this reason |
| Scope and Technology Bounds | **Pass** | English only; no dependency added; nothing here precludes future annotation kinds — the registry is the mechanism such a feature would use |

### No violations requiring justification

The cost worth naming is not a violation: **replacing single-cell selection
touches every reader of interaction state**, and feature 002's research
described that state as "one field" as a virtue. It becomes four. The virtue was
real and this feature spends it deliberately, because acting on one cell at a
time makes corner marks and colours tedious enough not to be worth having.

## Project Structure

### Documentation (this feature)

```text
specs/003-pencil-marks/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — D1 through D11
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── annotations.md   # What an annotation kind must supply
│   └── palette.md       # The two colour palettes and their obligations
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
site/
├── index.html
└── src/
    ├── main.ts                  # Keyboard: mode keys, shift+arrows for range
    ├── style.css                # Mark layout, 18 colours, data-theme
    ├── engine/                  # UNCHANGED. Annotations never reach it
    ├── rulesets/                # UNCHANGED
    ├── puzzles/                 # UNCHANGED
    ├── game/
    │   ├── data.ts              # Unchanged
    │   ├── progress.ts          # Version 2; annotations; separate theme key
    │   ├── state.ts             # selection: Set, anchor, mode, palette
    │   └── annotations/
    │       ├── registry.ts      # The kinds, by id (D1)
    │       ├── marks.ts         # centre and corner — one implementation, two ids
    │       └── colour.ts        # one palette entry per cell
    ├── ui/
    │   ├── grid.ts              # Pointer drag, multi-cell indication, layered cell
    │   ├── pad.ts               # 3x3 digits, mode buttons, swatches, palette control
    │   ├── controls.ts          # Gains the theme control
    │   └── theme.ts             # Read, apply, and store the choice (D11)
    └── (no new dependencies)

tests/e2e/
├── play.spec.ts                 # Existing — must still pass unchanged
├── conflicts.spec.ts            # Existing — SC-008 says these do not move
├── progress.spec.ts             # Existing, plus annotations surviving reload
├── puzzles.spec.ts              # Existing
├── site.spec.ts                 # Existing, plus the theme toggle
├── selection.spec.ts            # NEW — drag, modifier click, shift+arrows
├── marks.spec.ts                # NEW — centre, corner, toggling, erase layers
└── colour.spec.ts               # NEW — palettes, contrast, greyscale
```

**Structure Decision**: `game/annotations/` is a directory rather than a file
because FR-007 promises a fourth kind costs a file, not an edit. If adding one
ever means changing `registry.ts` beyond adding a line, the promise has been
broken and that is the place it will show.

`engine/` is listed explicitly as unchanged. It is the part Principle III
protects, and SC-008 asserts its behaviour is identical after this feature. Any
diff under `engine/` in this branch is a signal something went wrong.

## Deferred Decisions

Recorded so they are choices rather than oversights:

- **Undo.** Not in scope. Multi-cell placement makes a mistake more expensive
  than it was, which strengthens the case, but it is its own feature.
- **Modifier accelerators** — shift plus digit for corner marks, as several
  established Sudoku sites use. Deliberately excluded in D4 so the mode cannot
  be bypassed. Worth revisiting once the mode model has been used.
- **Automatic candidate marks.** Would require solving, which the site
  deliberately cannot do.
- **More than one colour per cell.** One is enough for grouping; stripes and
  gradients are a rendering problem with no clear payoff yet.
- **Selection shared across tabs.** Cross-tab sync stays limited to stored
  progress. Selection is working state.

## Complexity Tracking

> No constitution violations requiring justification.
