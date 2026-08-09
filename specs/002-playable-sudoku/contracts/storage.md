# Contract: Address and stored progress

**Feature**: 002-playable-sudoku

Two pieces of player-facing data. Both carry a version, and both may break before
Sucopeku 1.0 provided the failure is graceful (constitution 3.0.0).

## C1. The address

```
/?puzzle=p07        a specific puzzle
/                   no puzzle named — one is chosen at random
```

**Guarantees**:

- Opening a puzzle's address loads that puzzle and restores any progress on it
  (FR-020).
- Arriving without a puzzle selects one at random and **replaces the address**
  with that puzzle's, so a reload keeps the player where they were rather than
  reshuffling (FR-021).
- An unknown or malformed id gives the player a working puzzle rather than an
  error (FR-022, EC-010).
- The address carries **only an identifier**, never an encoded board (FR-023).

**Offline interaction**: every address serves the same document, so an offline
visitor can be served the cached page. This requires the service worker's
navigation fallback to match **ignoring the query string** — without it, offline
works at `/` and fails at `/?puzzle=p07`, which is the kind of bug that only
appears on a train.

## C2. Stored progress

One `localStorage` key, `sucopeku.progress`:

```json
{
  "v": 1,
  "puzzles": {
    "p07": {
      "entries": { "3": 4, "17": 9 },
      "solved": false,
      "unlocked": false,
      "playedAt": 1786000000000
    }
  }
}
```

**Guarantees**:

- **Saved without the player asking** (FR-027). There is no save control to
  forget.
- **`entries` holds the player's values only**, never givens. A puzzle's fixed
  cells come from the puzzle data, so a change there cannot be silently
  overwritten by old progress.
- **At most ten puzzles**, evicting the oldest `playedAt` (FR-029). Eviction is
  specified behaviour, not failure.
- **An unrecognised `v` discards the whole document** and the player starts fresh
  (EC-004). Before 1.0 this is the correct behaviour rather than a shortcut —
  no migration code exists until 1.0 makes it necessary.
- **Storage being unavailable or full never stops play** (EC-006). Persistence is
  an enhancement on a game that already works.
