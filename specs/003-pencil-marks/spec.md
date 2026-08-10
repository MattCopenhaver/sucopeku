# Feature Specification: Pencil Marks and Multi-Cell Selection

**Feature Branch**: `003-pencil-marks`

**Created**: 2026-08-09

**Status**: Implementing

**Input**: User description: "Pencil marks and multi-cell selection. Centre
marks, corner marks, and colour. Selection becomes a set of cells. The number
pad becomes a three by three grid with explicit mode buttons."

## Clarifications

### Session 2026-08-09

- Q: When the player presses erase, should it clear only the kind of thing the
  current mode governs, or everything in the selected cells at once? → A:
  Progressive — value, then marks, then colour.
- Q: With several cells selected where some hold values and some hold only
  marks, does erase decide once for the whole selection or per cell? → A: Once
  for the whole selection.
- Q: How does the player reach eighteen colours when the pad is a three-by-three
  grid of nine? → A: The pad stays 3×3 and a palette control switches between
  the two nines.
- Q: When a player completes a puzzle, are their pencil marks and colours
  cleared or kept? → A: Kept, hidden under the completed values like any other
  value.
- Q: Should the theme control be a two-way toggle, or offer a third "follow my
  device" position? → A: Three positions — Light, Dark, Auto — cycling in that
  order, with Auto the default. Without it, FR-047's device-following behaviour
  becomes unreachable after the first interaction.
- Q: Should a theme change in one tab appear in another? → A: Yes. Progress
  already synchronises through the browser's storage event and the theme is
  written to the same storage, so not following it would be a visible
  inconsistency rather than a saving.
- Q: Should the site gain a light/dark toggle? → A: Yes, as User Story 5. The
  theme became load-bearing when eighteen colours had to work on both grounds,
  and validating that otherwise means changing an operating system setting.
- Q: Should SC-005 keep requiring a cell holding nine centre marks, nine corner
  marks, a value and a colour to be legible at 320px, given a cell is about 31px
  there and the digits would land near 6px? → A: Keep it as written; digits that
  small are accepted at that width. Recorded so the criterion is understood to
  have been chosen with its cost known, not written by accident.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pencil in the candidates for a cell (Priority: P1)

A player working a hard puzzle narrows a cell to three possible digits but is
not ready to commit. They select the cell, switch to centre-mark mode, and press
those digits. Small digits appear in the middle of the cell. Later they rule one
out and press it again to remove it. When they finally know the answer they
switch back to value mode and enter it; the marks disappear behind the value.

**Why this priority**: This is the feature the player asked for. It is the
smallest slice that delivers the whole point — recording work in progress
without committing to it — and everything after it makes that faster or richer.

**Independent Test**: Select one cell, place three centre marks, remove one,
enter a value, erase the value. Fully exercisable with no other story built.

**Acceptance Scenarios**:

1. **Given** an empty cell is selected and centre-mark mode is active, **When**
   the player presses 1, 4, and 7, **Then** those three digits appear small in
   the middle of the cell and the cell still counts as empty.
2. **Given** a cell carries centre marks 1, 4, and 7, **When** the player
   presses 4 again, **Then** 4 is removed and 1 and 7 remain.
3. **Given** a cell carries centre marks, **When** the player switches to value
   mode and enters 9, **Then** the cell shows 9 and the marks are not visible.
4. **Given** that cell shows 9 over hidden marks, **When** the player erases the
   9, **Then** the original centre marks are visible again.
5. **Given** any mode is active, **When** the player looks at the number pad,
   **Then** the current mode is visibly indicated without interacting with it.

---

### User Story 2 - Act on several cells at once (Priority: P2)

A player wants the same annotation across a row of cells. Rather than repeating
themselves nine times, they drag across the cells — or extend the selection with
the keyboard — and place once. Every selected cell takes the change together.

**Why this priority**: It is what makes corner marks and colours practical
rather than tedious, and the player asked for it to apply to everything, not
only to marks. It is second because pencil marks are usable without it.

**Independent Test**: Select four cells three different ways — drag, modified
click, and shift plus arrows — then place a value and a centre mark into all of
them at once.

**Acceptance Scenarios**:

1. **Given** the grid is shown, **When** the player drags across four cells,
   **Then** all four are indicated as selected.
2. **Given** four cells are selected, **When** the player presses 6 in
   centre-mark mode, **Then** every one of the four gains a centre 6.
3. **Given** all four already carry a centre 6, **When** the player presses 6
   again, **Then** all four lose it.
4. **Given** two of the four carry a centre 6, **When** the player presses 6,
   **Then** all four carry it — the press adds unless every selected cell
   already has it.
5. **Given** several cells are selected, **When** the player clicks a single
   cell without a modifier, **Then** the selection collapses to that one cell.
6. **Given** a cell is selected, **When** the player holds shift and presses an
   arrow key, **Then** the selection extends rather than moving.
7. **Given** a selection includes cells that came with the puzzle, **When** the
   player places a value, **Then** the writable cells change and the given cells
   are left alone, with no error.
8. **Given** the player is on a touch device, **When** they drag across the
   grid, **Then** cells are selected and the page does not scroll.

---

### User Story 3 - Mark a digit's possible homes across a group (Priority: P3)

A player deduces that a 5 must live in one of three cells in a box, but not
which. They select those three cells and place a corner 5. Small digits appear
at the edges of each cell, leaving the middle free for candidate marks.

**Why this priority**: This is the notation the player named specifically, and
it depends on multi-cell selection to be worth having. Centre and corner marks
are independent of one another, so this can ship after Story 2 without
disturbing it.

**Independent Test**: Select three cells, place a corner mark, confirm it
appears at the edges in all three and does not disturb any centre marks already
present.

**Acceptance Scenarios**:

1. **Given** three cells are selected and corner-mark mode is active, **When**
   the player presses 5, **Then** a small 5 appears at the edge of each.
2. **Given** a cell carries both centre and corner marks, **When** the player
   looks at it, **Then** both are legible and neither obscures the other.
3. **Given** a cell carries corner marks, **When** the player enters a value,
   **Then** the corner marks are hidden and return when the value is erased.

---

### User Story 4 - Colour cells to group them visually (Priority: P4)

A player wants to see a chain or a pair at a glance. They select cells and apply
a colour; the cells' backgrounds change while every digit in them stays legible.

**Why this priority**: The most self-contained of the four and the least
essential to solving. It also carries the only real design risk — legibility
against a dark background — so it is best isolated at the end where it cannot
delay the rest.

**Independent Test**: Colour several cells from each palette and confirm every
digit in them, given or entered, remains readable.

**Acceptance Scenarios**:

1. **Given** cells are selected and colour mode is active, **When** the player
   chooses a colour, **Then** those cells take that background.
2. **Given** a coloured cell holds a value, a centre mark, and a corner mark,
   **When** the player looks at it, **Then** all three are legible against the
   colour.
3. **Given** a cell is coloured, **When** the player applies the same colour
   again, **Then** the colour is removed.

---

### User Story 5 - Choose light or dark (Priority: P5)

A player on a phone in bright sun wants the light theme even though their
device is set to dark. They press a control and the site changes; it stays
changed when they come back.

**Why this priority**: Last because nothing else depends on it. It is here at
all because this feature makes the theme load-bearing — eighteen colours have to
work on both grounds, and checking that currently means changing an operating
system setting.

**Independent Test**: Toggle the theme, confirm the whole site follows, reload
and confirm it held. Nothing from the other four stories is needed.

**Acceptance Scenarios**:

1. **Given** the site is showing the light theme, **When** the player uses the
   theme control, **Then** the site switches to dark and the control shows which
   is active.
2. **Given** the player has chosen a theme, **When** they reload, **Then** their
   choice is still in effect.
3. **Given** the player has never chosen, **When** they arrive, **Then** the site
   follows the device setting as it does today.
4. **Given** the player has chosen a theme, **When** they cycle the control back
   to following their device, **Then** the site follows the device again and
   nothing is left stored.
4. **Given** cells are coloured, **When** the theme changes, **Then** every
   colour is still distinguishable from the grid and every digit still legible.

---

### Edge Cases

- **EC-001**: When a selection contains cells that came with the puzzle, placing
  a value or a pencil mark MUST apply to the writable cells and skip the given
  ones, without reporting an error.
- **EC-002**: When a drag begins on the grid on a touch device, the page MUST
  NOT scroll for the duration of that drag.
- **EC-003**: When a drag leaves the grid and returns, the selection MUST
  continue from where the pointer re-enters rather than being abandoned.
- **EC-004**: When the player places an annotation while the puzzle is solved
  and locked, the grid MUST refuse the change exactly as it refuses a value.
- **EC-005**: When stored progress is in a format this release does not
  recognise, it MUST be discarded and the player given a fresh puzzle rather
  than an error. Before Sucopeku 1.0 this is the specified behaviour, not a
  shortcut (constitution 3.0.0).
- **EC-006**: When the player reloads, the selection MUST NOT be restored — it
  is working state, not progress. Annotations MUST be restored.
- **EC-007**: When a cell holds a value and the player switches to a mark mode
  and presses a digit, the mark MUST be recorded even though it is not visible,
  so that erasing the value reveals it.
- **EC-008**: When the browser denies or exhausts storage, annotation MUST keep
  working for the session exactly as value entry does.
- **EC-009**: When a cell carries the maximum nine centre marks and nine corner
  marks, the cell MUST remain legible at 320px width.
- **EC-010**: When the player selects every cell in the grid and places a mark,
  the grid MUST remain responsive to the next input.
- **EC-011**: When a stored theme choice is unreadable or names a theme that no
  longer exists, the site MUST fall back to the device setting rather than
  failing to render.

## Requirements *(mandatory)*

### Functional Requirements

**Annotations**

- **FR-001**: A player MUST be able to record centre marks on a cell: digits
  from the ruleset's values, shown small in the middle of the cell.
- **FR-002**: A player MUST be able to record corner marks on a cell: digits
  from the ruleset's values, shown small at the cell's edges.
- **FR-003**: A player MUST be able to apply a colour to a cell, changing its
  background.
- **FR-004**: Centre marks, corner marks, and colour MUST be independent — a
  cell may carry any combination, and changing one MUST NOT alter another.
- **FR-005**: Annotations MUST NOT be treated as values. The board evaluated for
  conflicts and completion MUST contain only givens and entered values.
- **FR-006**: Cells that came with the puzzle MUST NOT accept centre or corner
  marks, for the same reason they do not accept values.
- **FR-007**: The set of annotation kinds MUST be extensible: adding a fourth
  kind later MUST NOT require reworking the first three.

**Modes**

- **FR-008**: The site MUST provide exactly one active mode at a time, chosen
  from placing a value, a centre mark, a corner mark, or a colour.
- **FR-009**: The current mode MUST be visible without the player interacting
  with anything.
- **FR-010**: Every mode MUST be reachable by keyboard, by pointer, and by
  touch, per constitution Principle IX.
- **FR-011**: Pressing a digit MUST act on the current mode and no other.
- **FR-012**: The mode MUST persist across placements, so several marks can be
  made without reselecting the mode.
- **FR-013**: The mode MUST NOT be part of saved progress; it is working state
  and MUST reset to placing a value when a puzzle loads.

**Selection**

- **FR-014**: Selection MUST be a set of cells rather than a single cell, and
  MUST be allowed to contain any number of cells from zero to the whole grid.
- **FR-015**: Choosing a cell without a modifier MUST replace the selection with
  that one cell.
- **FR-016**: Dragging across the grid by pointer or touch MUST select the cells
  the drag passes through.
- **FR-017**: A modified click — control or command — MUST add a single cell to
  the selection without discarding the rest.
- **FR-018**: Shift with an arrow key MUST extend the selection; an arrow key
  alone MUST replace it with one cell, as it does today.
- **FR-019**: Every selected cell MUST be visibly indicated as selected.
- **FR-020**: The selection MUST NOT be part of saved progress.
- **FR-021**: Every placement — value, centre mark, corner mark, colour, and
  erase — MUST apply to every cell in the selection.

**Placement**

- **FR-022**: Placing a mark across a selection MUST add it to every selected
  cell, unless every selected cell already carries it, in which case it MUST be
  removed from all of them.
- **FR-023**: Entering a value in a cell MUST hide that cell's pencil marks
  without deleting them.
- **FR-024**: Erasing a value MUST make that cell's hidden pencil marks visible
  again.
- **FR-025**: The erase key MUST clear the selected cells one layer at a time,
  in the order value, then marks, then colour. The layer MUST be chosen once for
  the whole selection: if any selected cell holds a value, the press clears
  values from every selected cell; otherwise if any holds a mark, it clears
  centre and corner marks from every selected cell together; otherwise it clears
  colour. Repeated presses walk the whole selection down the layers in step.
- **FR-041**: Erase MUST ignore the current mode. It is the only control on the
  pad that does, so that a cluttered cell can be emptied without switching modes
  four times.
- **FR-044**: The selection MUST survive a placement. FR-022's rule — press
  again to remove — is only reachable if the same cells are still selected after
  the first press.
- **FR-026**: A placement that changes nothing — an annotation on a given cell,
  an erase on empty cells — MUST do nothing and MUST NOT report an error.

**The number pad**

- **FR-027**: The number pad MUST present the digits as a three-by-three grid.
- **FR-028**: The number pad MUST remain visible whenever a puzzle is shown.
- **FR-029**: The number pad MUST include an erase key and the mode controls.
- **FR-030**: The number pad MUST be usable at 320px width without horizontal
  scrolling, alongside the grid.

**Colour**

- **FR-031**: The site MUST offer two palettes of nine colours: one on which
  digits are rendered light, one on which they are rendered dark.
- **FR-032**: Every digit shown in a coloured cell — given, entered, centre
  mark, or corner mark — MUST remain legible against that colour.
- **FR-033**: Applying a cell's current colour again MUST remove the colour.
- **FR-034**: In colour mode the number pad MUST show nine swatches in the same
  three-by-three arrangement the digits use, and a palette control MUST switch
  between the light-digit nine and the dark-digit nine. The pad MUST NOT change
  shape between modes.
- **FR-042**: The active palette MUST be visible without interacting with it,
  and MUST be reachable by keyboard, by pointer, and by touch.
- **FR-043**: The active palette MUST NOT be part of saved progress. Like the
  mode, it is working state and MUST reset when a puzzle loads.

**Persistence**

- **FR-035**: Centre marks, corner marks, and colours MUST be saved without the
  player taking any action, exactly as values are.
- **FR-036**: Annotations MUST be restored when the player returns to a puzzle.
- **FR-037**: Stored progress MUST carry a version identifier, and progress
  written by an earlier release MUST be discarded gracefully rather than
  producing an error.
- **FR-038**: Annotation MUST continue to work when storage is unavailable,
  losing only persistence.

**Solved puzzles**

- **FR-039**: While a puzzle is solved and locked, annotations MUST be refused
  exactly as values are.
- **FR-040**: Solving a puzzle MUST NOT clear its annotations. A completed board
  is a board where every cell holds a value, and marks are hidden under values
  by FR-023 already — no special case applies. Unlocking and erasing a cell MUST
  reveal that cell's marks exactly as it does on an unsolved board.

**Theme**

- **FR-045**: A player MUST be able to choose the light theme, the dark theme,
  or to follow their device, directly and without changing a device setting. The
  control MUST cycle through all three, so no choice is a trap.
- **FR-046**: The choice MUST persist across visits.
- **FR-047**: With no choice made, the site MUST follow the device setting, as
  it does today.
- **FR-048**: The theme choice MUST NOT be stored with puzzle progress. It is a
  preference, not progress: it must survive the storage format changing and must
  not be evicted when a puzzle is.
- **FR-049**: The theme control MUST be reachable by keyboard, by pointer, and
  by touch, and MUST show which of the three positions is active.
- **FR-050**: A theme change made in one tab MUST appear in the site's other
  tabs without a reload, on the same basis progress already does.

**Legibility and layout**

- **FR-051**: In colour mode the digits MUST place colours, so that every mode
  is operable from the keyboard and not only its mode button.
- **FR-052**: Marks MUST be sized by how many the cell holds — comfortable when
  there are few, shrinking as they multiply — and a value MUST always render
  larger than any mark.
- **FR-053**: The controls MUST NOT change size or position when the mode
  changes. Only what they contain may change.
- **FR-054**: A mode control MUST show where its digits will land rather than
  naming the mode in words, and the palette control MUST show the colours it
  switches to.
- **FR-055**: The board MUST scale with the window rather than sitting at a
  fixed size, so a large display does not leave the game small enough to invite
  zooming, while a small screen still shows it whole.
- **FR-056**: Choosing colour mode while it is already active MUST switch to the
  other palette. The colour control MUST show the nine colours currently in use,
  so it is both the mode control and the palette indicator and there is no
  separate palette control.

### Key Entities

- **Annotation**: What a player records in a cell that is not a value. Has a
  kind (centre, corner, colour) and a payload (a set of digits, or one colour).
  A cell may hold one of each kind.
- **Selection**: The set of cells the next placement will apply to. Working
  state, never saved.
- **Mode**: Which kind of thing a digit press places. Working state, never
  saved, always exactly one.
- **Palette**: A named group of nine colours sharing a digit treatment, light or
  dark.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can record three candidate digits in a cell and remove
  one of them, using only the number pad, in under five interactions.
- **SC-002**: A player can apply the same annotation to nine cells in one
  placement rather than nine.
- **SC-003**: Every action in this feature is performable by keyboard alone, by
  pointer alone, and by touch alone.
- **SC-004**: Annotations survive a reload with 100% fidelity — every mark and
  colour present before is present after.
- **SC-005**: A cell carrying nine centre marks, nine corner marks, a value, and
  a colour is legible at 320px width.
- **SC-006**: Every digit is legible against every one of the eighteen colours,
  verified by a greyscale screenshot in which the digit remains distinguishable
  from its background.
- **SC-007**: Dragging across the grid on a touch device selects cells and never
  scrolls the page.
- **SC-008**: Conflict marking and solved detection behave exactly as they did
  before this feature, with annotations present.
- **SC-009**: Every one of the eighteen colours is distinguishable from the grid
  in both themes, checkable in under a minute by toggling rather than by
  changing a device setting.

## Assumptions

- **Pencil marks are per puzzle, like entries.** They are stored in the same
  document, evicted by the same ten-puzzle rule, and keyed the same way.
- **The digits available as marks are the ruleset's values**, not a hardcoded 1
  to 9. A future 4x4 ruleset gets a 2x2 pad and four marks without changing this
  specification.
- **Colour is a property of the cell, not of a digit.** One colour per cell.
- **Existing saved progress is discarded**, not upgraded. Constitution 3.0.0
  permits this before Sucopeku 1.0 and the player confirmed the choice.
- **No undo.** Out of scope here; nothing in this feature should make it harder
  to add.
- **No automatic candidate computation.** The site does not fill centre marks in
  for the player — that would require solving, which the site deliberately
  cannot do.
- **Selection is not shared across tabs.** Cross-tab synchronisation continues
  to cover stored progress only.

## Revisions

**2026-08-09 — interaction state gained a cursor.** No requirement changed.
FR-018 says shift plus an arrow extends the selection; implementing that with
only an anchor makes the second press recompute the same range, so the
selection never grows past two cells. A range needs a fixed end and a moving
one. Recorded in research.md D2 and the data model.

**2026-08-09 — `contracts/annotations.md` moved `render` to the UI side.** As
first written, a kind supplied its own renderer, which would have required DOM
code inside `game/annotations/` — the layer that must not have any. Behaviour
and appearance are now separate registries keyed by the same identifier, which
leaves FR-007 intact: a fourth kind is one file in each and no edit to the
others.

**2026-08-09 — first play produced eight corrections; four became requirements.**
FR-051 to FR-054 appended, research D6 rewritten, D12 and D13 added.

*Corner marks were not in the corners.* D6 had put them along the top and bottom
edges to guarantee they never collided with centre marks. The guarantee held and
the notation stopped being recognisable, which is worse. They now use the eight
perimeter positions with corners filled first, and a ninth mark shares a slot.
The no-collision guarantee survives.

*Colour was the only mode a keyboard could not operate.* FR-011 says a digit
press acts on the current mode; in colour mode the digits did nothing and the
swatches took clicks. The tests asserted FR-010 for the mode buttons and never
for what the mode then does, so they passed. FR-051 closes it.

*Marks were sized for the worst case.* A cell holds two or three candidates far
more often than nine, and sizing for nine made the common case unreadable.
FR-052.

*The pad moved when the mode changed*, and the erase and palette controls were
far larger than anything else. FR-053.

*The mode buttons named modes in words.* Showing where the digit lands is
self-describing; "Centre" is not. FR-054.

**2026-08-09 — FR-055 added: the board scales with the window.** It was a fixed
30rem, which fills a phone and leaves most of a high-resolution monitor empty.
The width is now the smallest of 92% of the viewport width, 62% of its height,
and 46rem — the height term is what makes a large screen useful, and the cap is
what stops the board becoming absurd on a very large one. 002 FR-029's
phone-width guarantee is unaffected: 92vw still wins there.

**2026-08-09 — FR-056 added: the colour control is the palette control.** The
separate palette strip is gone.

It had to exist whatever the mode, so it would not resize the pad (FR-053), and
outside colour mode it was a disabled bar taking space to do nothing. Folding it
into the colour mode button removes a control rather than arranging one better:
the button shows the nine colours in use, and choosing colour mode again
switches to the other nine.

FR-034 and FR-042 are unchanged in substance — the pad still shows nine swatches
in the same arrangement, and the active palette is still visible without
interacting and still reachable three ways. What changed is which control does
it.
