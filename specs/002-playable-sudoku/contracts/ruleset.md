# Contract: Ruleset format

**Feature**: 002-playable-sudoku

The format a ruleset is expressed in. This is the contract Principle III rests
on: **anything expressible here can be added without writing code.**

## Shape

```json
{
  "id": "classic-9x9",
  "name": "Classic Sudoku",
  "geometry": { "width": 9, "height": 9 },
  "values": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  "constraints": [
    { "primitive": "all-different", "cells": [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { "primitive": "all-different", "cells": [0, 9, 18, 27, 36, 45, 54, 63, 72] }
  ]
}
```

Classic Sudoku is 27 constraints: nine rows, nine columns, nine boxes.

## Guarantees

- **Cells are flat indices**, `0` to `width × height - 1`, left to right then top
  to bottom. No constraint mentions rows, columns, or boxes — those are names for
  particular cell sets, not concepts the format knows.
- **`id` is permanent.** It appears in stored progress. Reusing an id for
  different rules would silently reinterpret a player's saved board.
- **The evaluator resolves `primitive` through a registry.** An unknown primitive
  is a data error, not a crash: the constraint is skipped and the site still runs.

## What requires code

Adding a **primitive**. Expected to be rare — classic Sudoku needs exactly one,
and most variants compose from a small vocabulary (`all-different`, region sums,
ordered paths, pairwise relations).

Adding a **ruleset** must never require code. If a variant cannot be expressed
here, that is the signal a new primitive is needed — not a reason to special-case
it in the evaluator.

## Primitive: `all-different`

**Meaning**: among the named cells, no value may appear twice. Empty cells are
ignored.

**Reports**: every cell holding a value that another named cell also holds.

**Note**: it says nothing about whether the cells are *filled*. Completion is the
evaluator's business — every cell filled with no constraint violated — not any
individual primitive's.
