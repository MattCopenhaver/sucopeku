# Quickstart: Pencil Marks and Multi-Cell Selection

How to prove this feature works, by hand. Every scenario is something a player
does, which is also why the suite can cover almost all of it (Principle VIII).

## Prerequisites

```bash
npm install
npm run dev        # then open the address it prints
```

For the suite:

```bash
npm run test:e2e   # all browsers
npm run lint
```

## Scenario 1 — Pencil in candidates (US1, FR-001)

1. Click an empty cell. Switch to centre-mark mode.
2. Press 1, 4, 7. **Expect** three small digits in the middle of the cell.
3. Press 4 again. **Expect** 4 gone, 1 and 7 remaining (FR-022).
4. Switch to value mode, press 9. **Expect** 9 shown, marks not visible
   (FR-023).
5. Erase the 9. **Expect** 1 and 7 visible again (FR-024).
6. Reload. **Expect** the marks are still there (FR-036).

## Scenario 2 — The mode is always visible (FR-009)

1. Look at the pad in each of the four modes without interacting.
2. **Expect** the current one is identifiable each time.
3. Reload. **Expect** the mode is back to placing a value (FR-013).

## Scenario 3 — Select several cells three ways (US2, FR-016 to FR-018)

1. Drag across four cells. **Expect** all four indicated as selected.
2. Click one cell with no modifier. **Expect** the selection collapses to it
   (FR-015).
3. Control or command click three more. **Expect** four selected (FR-017).
4. Press shift with an arrow key. **Expect** the selection extends rather than
   moving (FR-018).
5. Press an arrow alone. **Expect** one cell selected.

## Scenario 4 — Place across a selection (FR-021, FR-022)

1. Select four empty cells. In centre-mark mode, press 6.
2. **Expect** all four gain a centre 6.
3. Press 6 again. **Expect** all four lose it.
4. Give just one of them a centre 6, reselect all four, press 6.
5. **Expect** all four now have it — adding wins unless every cell already had
   it.
6. Select a range that includes cells that came with the puzzle. Place a value.
7. **Expect** the writable cells change, the given ones do not, and no error
   appears (EC-001).

## Scenario 5 — Erase walks the layers (FR-025, FR-041)

1. Build a cell holding a colour, corner marks, centre marks, and a value.
2. Press erase. **Expect** the value gone, everything else intact.
3. Press erase. **Expect** both kinds of mark gone, colour intact.
4. Press erase. **Expect** the colour gone.
5. Repeat with several cells selected in mixed states. **Expect** each press
   clears one layer across all of them together, chosen by whether *any* holds
   that layer.
6. Do all of it without changing mode. **Expect** it works — erase ignores the
   mode.

## Scenario 6 — Corner marks and centre marks coexist (US3)

1. Put five centre marks and five corner marks in one cell.
2. **Expect** corner marks along the top and bottom edges, centre marks in the
   middle, neither obscuring the other (research.md D6).

## Scenario 7 — Colour (US4, FR-031 to FR-033)

1. Select cells, switch to colour mode, apply a colour.
2. **Expect** the backgrounds change and every digit stays readable.
3. Apply the same colour again. **Expect** it is removed (FR-033).
4. Switch palettes and apply one from the second nine (FR-034).
5. **Take a greyscale screenshot of a coloured cell holding a value, a centre
   mark, and a corner mark.** **Expect** all three still readable (SC-006).
6. Use the theme control to switch themes and repeat step 2. **Expect** the
   colours are still distinguishable from the grid in both (SC-009,
   research.md D5).

## Scenario 8 — Nothing about the game changed (SC-008)

1. Create a conflict with real values. **Expect** it is marked exactly as
   before.
2. Cover the conflicting cells in pencil marks. **Expect** the marking is
   unchanged — annotations never conflict (FR-005).
3. Solve a puzzle that has annotations on it. **Expect** it locks, and the
   annotations are still underneath when you unlock and erase a cell (FR-040).

## Scenario 9 — Touch, by hand on a real device

Playwright can synthesise the drag but cannot reliably report whether the page
also scrolled, so this half is manual (research.md D8).

1. On a phone, drag across several cells.
2. **Expect** cells are selected and **the page does not scroll** (EC-002,
   SC-007).
3. Reach every mode and both palettes by touch alone (FR-010, FR-042).

## Scenario 10 — Theme (US5, FR-045 to FR-049)

1. Use the theme control. **Expect** the whole site follows and the control
   shows which is active.
2. Reload. **Expect** your choice held (FR-046).
3. Clear the stored choice and reload. **Expect** the site follows the device
   setting (FR-047).
4. Choose a theme, then play until a puzzle is evicted, then reload. **Expect**
   the theme choice survived — it is not part of progress (FR-048).

## Scenario 11 — Storage, by hand

1. With progress saved by the current release, load the site. **Expect** your
   puzzle as you left it, annotations included.
2. Block storage for the site, reload. **Expect** the puzzle is fully playable
   and annotations work for the session (FR-038, EC-008).
