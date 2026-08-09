# Phase 1 Data Model: Playable Sudoku

**Feature**: 002-playable-sudoku
**Date**: 2026-08-09

Four entities, and the boundary between them is the point: **Ruleset, Constraint,
and Puzzle are data**; only the evaluator that consumes them is code.

---

## Entity: Geometry

The shape of a board, as a parameter rather than an assumption.

| Field | Type | Notes |
|---|---|---|
| `width` | integer | 9 for classic |
| `height` | integer | 9 for classic |

Cells are addressed by **flat index**, `0` to `width × height - 1`, reading left
to right then top to bottom. Constraints therefore never mention rows or columns,
which is what allows a later geometry with irregular regions to need no new
addressing scheme (research.md D1).

---

## Entity: Constraint

One rule applied to a set of cells. The unit the evaluator understands.

| Field | Type | Notes |
|---|---|---|
| `primitive` | string | Names an entry in the primitive registry |
| `cells` | integer[] | Flat indices this rule applies to |

Classic Sudoku uses one primitive, `all-different`, across 27 constraints — nine
rows, nine columns, nine boxes.

**Adding a primitive is code and expected to be rare.** Adding a constraint, or a
whole ruleset of them, is data and must always be possible without code
(Principle III).

---

## Entity: Ruleset

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable and permanent; appears in stored progress. `classic-9x9` |
| `name` | string | For display |
| `geometry` | Geometry | |
| `values` | integer[] | The values a cell may hold. `[1..9]` for classic |
| `constraints` | Constraint[] | |

Ships as a committed JSON file. The runtime reads it; nothing generates it at
run time (research.md D2).

**Validation**: every index in every constraint must fall inside the geometry. A
ruleset that fails this is a defect in the data, and the site must still start —
see EC-003's neighbourhood.

---

## Entity: Puzzle

| Field | Type | Notes |
|---|---|---|
| `id` | string | Opaque, permanent, appears in addresses. `p01`…`p20` |
| `ruleset` | string | A ruleset `id`. `classic-9x9` for all twenty |
| `givens` | map index→value | Sparse. Only the cells the puzzle fixes |

**Identity**: the `id` is the only thing that must never change. It appears in
the address a player may bookmark and in their stored progress, so reusing an id
for a different board would silently corrupt both.

**Uniqueness**: each puzzle has exactly one solution, verified before shipping,
with the method and date recorded beside the data (FR-002, research.md D3). The
running site never verifies this and holds no solution.

---

## Entity: Board

The playing state. Not stored as an entity in its own right — it is derived.

```
Board = (value | null)[]        one entry per cell
      = givens overlaid with the player's entries
```

A cell is **given** if its index appears in the puzzle's `givens`, and given
cells are never writable (FR-004).

---

## Entity: Progress

What the player has done to one puzzle.

| Field | Type | Notes |
|---|---|---|
| `entries` | map index→value | The player's values only. Never includes givens |
| `solved` | boolean | Set when the board completes with no conflicts |
| `unlocked` | boolean | Whether a solved puzzle was reopened for editing |
| `playedAt` | epoch ms | What the ten-puzzle cap evicts by |

Stored inside one versioned document keyed by puzzle id (research.md D5):

```
{ v: 1, puzzles: { "p07": Progress, "p12": Progress, ... } }
```

### Lifecycle

```
no progress ──first entry──► in progress ──board complete, no conflicts──► solved
                                  ▲                                          │
                                  └──────────────── unlock ──────────────────┘
```

- **in progress**: entries accumulate; every change is saved without the player
  asking (FR-027)
- **solved**: the grid locks; nothing can be entered or erased (FR-023)
- **unlocked**: editing resumes. Clearing a value returns it to *in progress*
  rather than leaving a stale solved flag (EC-007)

### Eviction

At most ten puzzles are retained. When an eleventh is played, the one with the
oldest `playedAt` is dropped (FR-029). Eviction is deliberate and specified, not
a failure — distinct from the format being discarded, below.

### Version handling

`v` identifies the format. Before Sucopeku 1.0, a document whose `v` is
unrecognised is **discarded whole** and the player starts fresh (constitution
3.0.0, EC-004). This is why the cheapest correct behaviour is also the specified
one: no migration code exists until 1.0 makes it necessary.

---

## Non-Entities

Stated so their absence is deliberate:

- **No solution.** The site never holds the answer to any puzzle. Completion is
  *every cell filled, no constraint violated* (FR-007), which is why the engine
  needs no solver and why uniqueness must be verified before shipping.
- **No player, account, or session.** Progress belongs to a browser, not a person.
- **No difficulty, ordering, or authorship** on a puzzle. Adding any of them later
  is additive; encoding them in the `id` would not be.
- **No pencil marks.** Deliberately absent, and deliberately not designed out —
  a cell holding a set of candidate values is the obvious later extension to
  `entries`.
