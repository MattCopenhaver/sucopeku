# Contract: Curated puzzle format

**Feature**: 002-playable-sudoku

## Shape

```json
{
  "verifiedUnique": {
    "method": "<how each puzzle's single solution was confirmed>",
    "date": "<when>"
  },
  "puzzles": [
    { "id": "p01", "ruleset": "classic-9x9", "givens": { "0": 5, "4": 7, "80": 9 } }
  ]
}
```

## Guarantees

- **`id` is opaque and permanent.** It appears in the address a player may
  bookmark and in their stored progress. Reusing an id for a different board
  corrupts both, silently.
- **`givens` is sparse** — only the cells the puzzle fixes. Given cells are never
  writable by the player (FR-004).
- **Every puzzle has exactly one solution** (FR-002), verified before shipping.
  `verifiedUnique` records how and when, because the running site never checks
  and holds no solution.
- **Nothing encodes difficulty, ordering, or authorship.** Adding any later is
  additive; putting it in the `id` would not be.

## What this format is not

It is not a share format. A link carries a puzzle **id**, and the board itself
ships with the site. Encoding an arbitrary board into a link belongs to the
generation feature, where puzzles exist that were never shipped.
