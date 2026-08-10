# Quickstart: Validating Playable Sudoku

**Feature**: 002-playable-sudoku
**Date**: 2026-08-09

How to prove this feature works. Each scenario maps to acceptance criteria in
[spec.md](./spec.md); formats are described in [contracts/](./contracts).

## Prerequisites

Everything feature 001 installed. No new dependencies.

```bash
npm install
npm run dev          # site at localhost:5173
npm run build && npm run preview
npm run lint
npm run test:e2e
```

---

## Scenario 1 — Solve a puzzle (US1)

1. Open the site. **Expect** a Sudoku grid with some cells already filled, a
   number pad showing 1–9 and an erase key, and a new-puzzle control.
2. Choose a digit on the pad, then choose an empty cell. **Expect** the digit
   appears, and **stays selected** so you can place it again elsewhere (FR-010).
3. Choose a cell that came with the puzzle. **Expect** nothing changes (FR-004).
4. Select erase, choose a cell you filled. **Expect** it empties (FR-014).
5. Select erase, choose an empty cell. **Expect** nothing happens and no error
   (FR-015).
6. Fill the grid correctly. **Expect** the puzzle shows as solved and the grid
   locks — further entry does nothing (FR-022, FR-023).
7. Use the unlock control, then clear a value. **Expect** editing works again and
   the puzzle is no longer shown as solved (FR-024, EC-007).

## Scenario 2 — Every action, three ways (US1, FR-017)

Do the same sequence three times. Principle IX means all three must work, and
this is the scenario that proves it.

| Method | Path |
|---|---|
| Pointer | Click a pad key, click cells |
| Keyboard | Arrow keys to move, type a digit, Backspace to clear |
| Touch | On a phone or emulated touch: tap a pad key, tap cells |

**Expect** identical outcomes. Any action possible one way and not another is a
Principle IX failure, not a rough edge.

## Scenario 3 — Conflicts (US2)

1. Place a value, then place the same value elsewhere in its **row**. **Expect**
   both cells marked.
2. Repeat for a **column**, and for a **three-by-three box**.
3. Clear one of them. **Expect** both markings clear (FR-020).
4. **Take a greyscale screenshot with a conflict on the board.** **Expect** the
   conflict is still identifiable (SC-009) — this is the check that catches
   colour-only marking, and it will not fail in normal use.

## Scenario 4 — Progress (US3)

1. Fill several cells. Reload. **Expect** your entries are still there (FR-031).
2. Close the browser entirely and return. **Expect** the same.
3. Note the address. Use the new-puzzle control, fill a cell, then open the first
   puzzle's address. **Expect** the first puzzle's own entries, untouched
   (FR-033, FR-039, SC-006).
4. Solve a puzzle, leave, return. **Expect** it still shows as solved and locked.

## Scenario 5 — Addresses (US4)

1. Open `/` with no puzzle named. **Expect** a puzzle appears and the address
   becomes `/?puzzle=<id>` (FR-026, FR-028).
2. Reload. **Expect** the **same** puzzle, not a new random one — this is what
   FR-028's address replacement buys.
3. Use the new-puzzle control. **Expect** a different puzzle at its own address.
4. Press the browser back button. **Expect** the previous puzzle with its
   progress (FR-039).
5. Open `/?puzzle=nonsense`. **Expect** a working puzzle, not an error (EC-010).

## Scenario 6 — Offline (Principle IV)

Worth doing by hand, because the automated suite cannot reach WebKit's service
worker and iOS is WebKit-only.

1. Load a puzzle with a network. Fill a few cells.
2. Turn off the network. Reload. **Expect** the puzzle loads with your entries.
3. **Reload again at `/?puzzle=<id>` specifically**, still offline. **Expect** it
   still loads. If it fails here but works at `/`, the service worker's fallback
   is not ignoring the query string — see contracts/storage.md C1.

## Scenario 7 — Storage refuses (EC-006)

1. Disable storage for the site, or fill the quota.
2. Play. **Expect** the puzzle remains fully playable for the session, with no
   error blocking play. Progress is lost on reload, which is acceptable; failing
   to start is not.

---

## Definition of done

Per the constitution:

- All required checks green on the pull request
- `spec.md`, `plan.md`, and `tasks.md` current with what was built
- A human-written `## SDD Notes` section in the pull request body

**Worth capturing in those notes**: this is the first feature where the no-unit-test
experiment meets code that would ordinarily have unit tests. The constraint
evaluator is pure, branchy logic verified only by placing digits in a grid. Whether
that was sufficient — or whether a defect reached `main` that a unit test would
have caught — is the result the constitution asks be reported rather than quietly
fixed by adding one.

---

*Citations corrected 2026-08-09. Five pointed at the numbers these obligations
held before clarification inserted the interaction requirements and shifted
everything after them — a greyscale check citing the 320px criterion, a reload
check citing the addressing requirement, and address replacement cited as the
rule about conflict colour. Every one resolved, so the citation check never
objected. See the constitution's amendment 3.3.0.*
