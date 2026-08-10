# Tasks: Pencil Marks and Multi-Cell Selection

**Feature**: `specs/003-pencil-marks/` | **Plan**: [plan.md](./plan.md)

**Tests**: Browser tests only, by Principle VIII. There are no unit test tasks
here, and their absence is a constitutional choice rather than an oversight.

---

## Phase 1: Setup

- [ ] T001 [P] Create `site/src/game/annotations/registry.ts` with the kind contract from contracts/annotations.md — `id`, `empty`, `toggle`, `parse`, `render` — and a lookup that returns undefined for an unknown id rather than throwing (FR-007)
- [ ] T002 [P] Add the interaction types to `site/src/game/state.ts`: a mode of value, centre, corner, or colour, and a palette of light-digit or dark-digit (FR-008, FR-043)

---

## Phase 2: Foundational

**Blocking.** Every story below depends on these. Selection becomes a set here
rather than in User Story 2, because every reader of interaction state changes
with it and doing that twice would be worse than doing it early — User Story 1
simply uses a set of size one.

- [ ] T003 Replace `selectedCell` with `selection: Set<number>` and an `anchor` in `site/src/game/state.ts`, updating every reader (FR-014, research.md D2)
- [ ] T004 Indicate every selected cell in `site/src/ui/grid.ts`, not just one (FR-019)
- [ ] T005 [P] Implement the shared mark kind in `site/src/game/annotations/marks.ts`, registered twice under the ids `centre` and `corner` — the payload and toggle rule are identical and only the renderer differs (FR-001, FR-002, FR-004)
- [ ] T006 [P] Implement the colour kind in `site/src/game/annotations/colour.ts`: one palette entry per cell, re-applying the same colour removes it (FR-003, FR-033)
- [ ] T007 Route every placement through the registry in `site/src/game/state.ts`, applying to all selected cells with the toggle computed once across the selection (FR-021, FR-022, contracts/annotations.md)
- [ ] T008 Exclude given cells from both the toggle test and the change, so a mixed selection behaves as though the givens were not selected. A placement that changes nothing MUST stay silent rather than reporting an error (FR-006, FR-026, EC-001)
- [ ] T009 Keep the selection intact after a placement, or FR-022's press-again-to-remove is unreachable (FR-044)
- [ ] T010 Implement the erase layer walk in `site/src/game/state.ts`: value, then both mark kinds together, then colour, with the layer chosen once for the whole selection and the mode ignored. Erasing cells that hold nothing does nothing and reports no error (FR-025, FR-026, FR-041)
- [ ] T011 Move stored progress to version 2 in `site/src/game/progress.ts`, adding `annotations` keyed by kind, and discard a version 1 document rather than upgrading it (FR-035, FR-036, FR-037, EC-005, data-model.md)
- [ ] T012 Drop annotation payloads that name values outside `ruleset.values` or unknown kinds when loading, rather than treating bad data as fatal (contracts/annotations.md)
- [ ] T013 Rebuild the number pad in `site/src/ui/pad.ts` as a three-by-three grid of digits with an erase key and four mode buttons, the active mode visible without interaction (FR-009, FR-027, FR-028, FR-029)
- [ ] T014 Reset mode to value, palette to light-digit, and the selection to a single writable cell when a puzzle loads. None of the three is stored (FR-013, FR-020, FR-043, EC-006)
- [ ] T015 Confirm nothing under `site/src/engine/` changed and that the board passed to `evaluate` still holds only givens and entries (FR-005, plan.md Structure Decision)

**Checkpoint**: the pad is a 3×3 grid with modes, the registry exists, and
selection is a set. Nothing is visibly annotatable yet.

---

## Phase 3: User Story 1 — Pencil in the candidates (P1)

**Goal**: a player records candidate digits in a cell and removes them again.

**Independent test**: select one cell, place three centre marks, remove one,
enter a value, erase it. Needs nothing from Stories 2 to 5.

- [ ] T016 [US1] Render centre marks in the middle of a cell in `site/src/ui/grid.ts`, drawn only when the cell holds no value (FR-001, FR-023, research.md D9)
- [ ] T017 [US1] Draw the value over hidden marks without deleting them, so erasing the value reveals them again (FR-023, FR-024, EC-007)
- [ ] T018 [US1] Add mode switching in `site/src/main.ts` on the keys z, x, c, and v, which switch the mode and place nothing (FR-010, FR-011, FR-012, research.md D4)
- [ ] T019 [US1] Refuse annotations while a puzzle is solved and locked, exactly as values are refused — and confirm solving does not *clear* them: unlocking and erasing a cell must reveal what was there (FR-039, FR-040, EC-004)
- [ ] T020 [US1] Style centre marks in `site/src/style.css` so they read as annotations rather than values and stay legible at 320px (FR-030)
- [ ] T021 [P] [US1] Write `tests/e2e/marks.spec.ts`: place three centre marks, press one again to remove it, confirm the cell still counts as empty for conflicts (FR-005, FR-022, SC-001)
- [ ] T022 [US1] Extend `tests/e2e/marks.spec.ts`: enter a value over marks, confirm they are hidden, erase the value, confirm they return, then reload and confirm every mark is still present (FR-023, FR-024, SC-004, quickstart Scenario 1)
- [ ] T023 [US1] Extend `tests/e2e/marks.spec.ts` to reach every mode by keyboard alone and by pointer alone, proving parity (FR-010, SC-003, quickstart Scenario 2)

**Checkpoint**: this is the MVP. A player can pencil in their thinking, which is
the whole request. Everything after it makes that faster or richer.

---

## Phase 4: User Story 2 — Act on several cells at once (P2)

**Goal**: build a multi-cell selection three ways and place into all of it.

**Independent test**: select four cells by drag, by modified click, and by
shift plus arrows, then place a value and a centre mark into all four.

- [ ] T024 [US2] Implement drag selection in `site/src/ui/grid.ts` with `pointerdown`, `pointermove`, and `pointerup`, one path for mouse, touch, and pen (FR-016, research.md D3)
- [ ] T025 [US2] Identify cells during a drag with `document.elementFromPoint` rather than `pointerenter`, because implicit pointer capture stops enter firing and would select exactly one cell on touch while appearing to work on a mouse (FR-016, research.md D3)
- [ ] T026 [US2] Set `touch-action: none` on the grid alone in `site/src/style.css`, so a drag does not scroll the page and the rest of the page still scrolls (EC-002, SC-007)
- [ ] T027 [US2] Continue a drag that leaves the grid and returns, rather than abandoning the selection (EC-003)
- [ ] T028 [US2] Add a cell to the selection on control or command click without discarding the rest, and collapse to one cell on a plain click or tap (FR-015, FR-017)
- [ ] T029 [US2] Extend the selection with shift plus an arrow key in `site/src/main.ts`, from the anchor, leaving a bare arrow key replacing the selection as it does today (FR-018, research.md D2)
- [ ] T030 [P] [US2] Write `tests/e2e/selection.spec.ts`: build a four-cell selection by drag, by modified click, and by shift plus arrows, confirming each (FR-015 to FR-018, SC-003)
- [ ] T031 [US2] Extend `tests/e2e/selection.spec.ts`: place a mark across four cells, press again to remove from all four, and confirm a selection where only some carry it gains it everywhere (FR-021, FR-022, SC-002)
- [ ] T032 [US2] Extend `tests/e2e/selection.spec.ts` with a drag dispatched as `pointerType: 'touch'`, covering the selection half of SC-007 — the did-not-scroll half is manual, see T052 (research.md D8)
- [ ] T033 [US2] Extend `tests/e2e/selection.spec.ts`: select a range spanning given and writable cells, place a value, confirm the givens are untouched and no error appears (EC-001)
- [ ] T034 [US2] Extend `tests/e2e/selection.spec.ts`: select all 81 cells, place a mark, confirm the grid still responds to the next input (EC-010)

**Checkpoint**: annotation is practical rather than tedious.

---

## Phase 5: User Story 3 — Corner marks (P3)

**Goal**: mark a digit's possible homes across a group of cells.

**Independent test**: select three cells, place a corner mark, confirm it
appears at the edges of all three without disturbing centre marks.

- [ ] T035 [US3] Render corner marks in `site/src/ui/grid.ts` along the top edge up to five and the bottom edge up to four, never the middle (FR-002, research.md D6)
- [ ] T036 [US3] Style corner marks in `site/src/style.css` so they are distinguishable from centre marks and from values (FR-004)
- [ ] T037 [P] [US3] Extend `tests/e2e/marks.spec.ts`: place a corner mark across three cells, confirm all three carry it (FR-002, FR-021)
- [ ] T038 [US3] Extend `tests/e2e/marks.spec.ts`: a cell holding both centre and corner marks shows both, with neither obscuring the other (US3 scenario 2)
- [ ] T039 [US3] Extend `tests/e2e/marks.spec.ts` for the erase walk: build a cell with colour, corner marks, centre marks, and a value, then confirm three presses clear the layers in order without changing mode (FR-025, FR-041, quickstart Scenario 5)

---

## Phase 6: User Story 4 — Colour (P4)

**Goal**: group cells visually without touching their values.

**Independent test**: colour cells from both palettes and confirm every digit in
them stays legible.

- [ ] T040 [US4] Define the eighteen colours in `site/src/style.css` per contracts/palette.md, each reaching at least 4.5:1 against its own palette's digit treatment and distinguishable from both theme backgrounds (FR-031, FR-032, research.md D5)
- [ ] T041 [US4] Show nine swatches in the pad's existing three-by-three arrangement while in colour mode, without changing the pad's shape (FR-034)
- [ ] T042 [US4] Add the palette control in `site/src/ui/pad.ts`, visible without interaction and reachable by keyboard, pointer, and touch (FR-042)
- [ ] T043 [US4] Render the cell background from its colour in `site/src/ui/grid.ts`, beneath marks and values (data-model.md rendering order)
- [ ] T044 [P] [US4] Write `tests/e2e/colour.spec.ts`: apply a colour across a selection, re-apply to remove it, and reach the second palette through the control (FR-033, FR-034)
- [ ] T045 [US4] Add a greyscale screenshot assertion to `tests/e2e/colour.spec.ts` proving a value, a centre mark, and a corner mark all stay distinguishable on a coloured cell (SC-006)
- [ ] T046 [US4] Extend `tests/e2e/colour.spec.ts` to run under both `colorScheme: 'dark'` and `'light'`, confirming every colour stays distinguishable from the grid in each (SC-009, research.md D5)

---

## Phase 7: User Story 5 — Light or dark (P5)

**Goal**: the player chooses a theme rather than inheriting one.

**Independent test**: cycle the control through all three positions, reload, and
confirm the choice held. Needs nothing from Stories 1 to 4.

- [ ] T047 [US5] Write `site/src/ui/theme.ts`: read the stored choice from its own key — never the progress document, so it survives eviction and the format change — apply it as `data-theme` on the root element, and cycle light, dark, and following the device, the third removing the key rather than storing a value (FR-045, FR-047, FR-048, research.md D11)
- [ ] T048 [US5] Redefine the theme custom properties under `:root[data-theme]` in `site/src/style.css` alongside the existing media query, so the no-choice case still works with no script (FR-047, research.md D11)
- [ ] T049 [US5] Add the theme control to `site/src/ui/controls.ts`, showing which of the three positions is active and reachable three ways (FR-046, FR-049)
- [ ] T050 [US5] Reflect a theme change from another tab through the storage event already used for progress, and fall back to the device setting when the stored value is unreadable (FR-050, EC-011)
- [ ] T051 [P] [US5] Extend `tests/e2e/site.spec.ts`: cycle all three positions, reload and confirm the choice held, cycle back to following the device and confirm nothing is stored (FR-045 to FR-047, quickstart Scenario 10)

---

## Phase 8: Polish and cross-cutting

- [ ] T052 Validate quickstart Scenario 9 by hand on a real device: drag across the grid and confirm cells are selected and the page does not scroll. Playwright drives the drag but will not reliably report scrolling (SC-007, research.md D8)
- [ ] T053 Validate quickstart Scenario 11 by hand: block storage for the site and confirm annotation still works for the session (FR-038, EC-008)
- [ ] T054 Confirm a cell holding nine centre marks, nine corner marks, a value, and a colour renders at 320px (SC-005, EC-009). The spec knowingly accepts digits near 6px here — see the Clarifications entry before judging the result
- [ ] T055 Run the feature 002 suites unchanged and confirm conflict marking and solved detection are identical with annotations present (SC-008, FR-005)
- [ ] T056 Update `specs/003-pencil-marks/plan.md` and this file if anything built diverged from what was planned
- [ ] T057 Write the human-authored `## SDD Notes` section in this feature's pull request body

---

## Dependencies

```text
Setup (T001-T002)
   └─> Foundational (T003-T015)        selection becomes a set; registry; storage v2
          ├─> US1  (T016-T023)  P1     centre marks              ← MVP
          ├─> US2  (T024-T034)  P2     multi-cell selection
          ├─> US3  (T035-T039)  P3     corner marks
          └─> US4  (T040-T046)  P4     colour

       US5 (T047-T051)  P5             theme — independent of everything above

Polish (T052-T057) last
```

US3 and US4 are far more useful after US2 but do not depend on it: a corner mark
or a colour can be placed on a single cell. US5 touches no shared state and
could be built at any point, including first.

## Parallel opportunities

- **T001 and T002** — different files, no shared state
- **T005 and T006** — the two annotation kind implementations
- **T021, T030, T037, T044, T051** — each story's first test file
- **US5 entirely** — it shares no file with the other four stories except
  `style.css`, and only to add a selector

## Implementation strategy

**Stop after T023 and play it.** That checkpoint is the whole request — pencil
in a value to remember your work. Everything after makes it faster, richer, or
prettier, and each phase can be judged on its own once the MVP proves the model.

The riskiest task in the list is **T025**, and it is risky in a way that hides:
getting it wrong produces a drag that works perfectly on a mouse and selects one
cell on every phone. Test it on touch before believing it.

## Notes

- No unit test tasks appear in this list, by constitutional principle rather
  than by oversight
- Every test task drives a real browser and asserts what a person would see
- WebKit is not a final check. Feature 002 found three defects that appeared
  only there, two of which made the game unusable by keyboard
- Commit after each task or logical group; the pull request is squash-merged, so
  granular commits cost nothing
