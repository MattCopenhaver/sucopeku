# Feature Specification: Playable Sudoku

**Feature Branch**: `002-playable-sudoku`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "A playable Sudoku game. When a player starts, they are given one of 20 curated puzzles chosen at random. They can enter and clear values in cells, and the game shows conflicts under the classic Sudoku ruleset. Progress on a puzzle is saved in the browser and restored when the player returns to it. Playable by keyboard, mouse, and touch. Puzzle generation is out of scope for this feature — the 20 puzzles are curated data shipped with the site."

## User Scenarios & Testing *(mandatory)*

The user of this feature is a **player**. This is the first feature Sucopeku
delivers to one — everything before it built the path a change travels, not
something to play.

### User Story 1 - Solve a Sudoku (Priority: P1)

A player opens Sucopeku and is given a Sudoku puzzle. Some cells already hold
numbers and cannot be changed; the rest are empty. The player moves to a cell,
enters a number, and sees it appear. They change their mind, clear it, and enter
another. When every cell is filled correctly, the puzzle is solved and the player
is told so.

**Why this priority**: Without it there is no game. Every other story in this
feature decorates, protects, or persists this one.

**Independent Test**: Open the site, fill every empty cell with the correct
values, and confirm the game recognises the puzzle as solved. Delivers the whole
point of the project even with no conflict marking and no saving.

**Acceptance Scenarios**:

1. **Given** a player opening Sucopeku, **When** the page loads, **Then** a
   Sudoku grid appears with some cells already filled.
2. **Given** an empty cell, **When** the player enters a number from 1 to 9,
   **Then** that number appears in the cell.
3. **Given** a cell the player filled, **When** they clear it, **Then** the cell
   is empty again.
4. **Given** a cell that came with the puzzle, **When** the player attempts to
   change it, **Then** its value does not change.
5. **Given** a grid one correct value from completion, **When** that value is
   entered, **Then** the player is told the puzzle is solved.

---

### User Story 2 - See mistakes as they happen (Priority: P2)

A player enters a number that conflicts with another value — same row, same
column, or same three-by-three box. The game marks the conflict so they can see
it immediately, rather than discovering at the end that the grid cannot be
completed.

**Why this priority**: Independently valuable and independently testable — the
game is playable without it, just less forgiving. It also exercises the ruleset
machinery that every future variant depends on.

**Independent Test**: Enter two identical numbers in the same row and confirm
both are marked as conflicting; change one and confirm the marking clears.

**Acceptance Scenarios**:

1. **Given** a value in a cell, **When** the player enters the same value
   elsewhere in that row, **Then** both cells are marked as conflicting.
2. **Given** the same situation in a column, **Then** both cells are marked.
3. **Given** the same situation within a three-by-three box, **Then** both cells
   are marked.
4. **Given** two conflicting cells, **When** one is cleared or changed so no
   conflict remains, **Then** neither is marked.
5. **Given** a conflict on the board, **When** the player looks at the grid,
   **Then** the conflict is distinguishable without relying on colour alone.

---

### User Story 3 - Come back to a puzzle in progress (Priority: P3)

A player fills in part of a puzzle and leaves. When they return — reloading,
closing the tab, coming back the next day — the puzzle is as they left it, with
their entries intact.

**Why this priority**: A Sudoku takes long enough that interruption is normal.
Losing a half-finished grid to a reload is the kind of failure that ends a
player's relationship with a site.

**Independent Test**: Fill several cells, reload the page, and confirm those
cells still hold their values.

**Acceptance Scenarios**:

1. **Given** a puzzle with several cells filled, **When** the page is reloaded,
   **Then** those cells still hold the player's values.
2. **Given** a puzzle in progress, **When** the player returns after closing the
   browser entirely, **Then** their progress is still there.
3. **Given** a solved puzzle, **When** the player returns, **Then** it is still
   shown as solved.
4. **Given** progress on a puzzle, **When** the player starts a different puzzle
   and later returns to the first, **Then** the first puzzle's progress is
   intact.

---

### User Story 4 - Play a different puzzle (Priority: P4)

A player finishes a puzzle, or tires of one, and asks for another. They are given
a different puzzle from the curated set.

**Why this priority**: Twenty puzzles are worth little if a player can only ever
reach the one they were first given. It ranks last because a player can already
play a full game without it.

**Independent Test**: Start a new puzzle and confirm it differs from the previous
one, and that the previous one's progress is unaffected.

**Acceptance Scenarios**:

1. **Given** a player on any puzzle, **When** they ask for a new one, **Then** a
   different puzzle from the curated set is shown.
2. **Given** a new puzzle has been started, **When** the player returns to the
   previous one, **Then** its progress is intact.
3. **Given** the player has played several puzzles, **When** they ask for another,
   **Then** they are not repeatedly given one they have already completed while
   unplayed puzzles remain.

---

### Edge Cases

Each carries an identifier and states an obligation, per the constitution. Edge
cases are traced and covered by tasks exactly as functional requirements are.

- **EC-001**: When the player enters a character that is not 1 through 9, the
  grid MUST NOT change and MUST NOT report an error state.
- **EC-002**: When the player enters a value into a cell that already holds one,
  the new value MUST replace the old.
- **EC-003**: When stored progress refers to a puzzle that no longer exists in
  the curated set, the player MUST be given a working puzzle rather than an
  error or an empty grid.
- **EC-004**: When stored progress is unreadable or corrupt, the player MUST be
  given a working puzzle. Losing progress is acceptable; failing to start is not.
- **EC-005**: When a stored entry conflicts with the puzzle's fixed values —
  possible only through tampering or a format change — the puzzle MUST still
  load, showing the conflict rather than refusing to open.
- **EC-006**: When the browser denies or exhausts storage, the puzzle MUST remain
  fully playable for the session. Persistence is an enhancement on top of a game
  that already works.
- **EC-007**: When the player completes a puzzle, further entry into it MUST NOT
  be able to break the solved state into an inconsistent one.
- **EC-008**: When the same puzzle is open in two browser tabs, neither MUST
  corrupt the other's stored progress into an unloadable state.
- **EC-009**: When the grid is displayed at 320px width, every cell MUST remain
  legible and reachable without horizontal scrolling.

## Requirements *(mandatory)*

### Functional Requirements

**The puzzle**

- **FR-001**: The site MUST ship with 20 curated Sudoku puzzles as data.
- **FR-002**: Every curated puzzle MUST have exactly one solution under the
  classic ruleset, per constitution Principle II.
- **FR-003**: When a player has no puzzle in progress, the site MUST give them
  one of the curated puzzles chosen at random.
- **FR-004**: Cells that come with the puzzle MUST NOT be changeable by the
  player.

**The ruleset**

- **FR-005**: Classic Sudoku MUST be expressed as data — a composition of
  constraint primitives over sets of cells — and MUST NOT be implemented as
  procedural logic specific to it, per constitution Principle III.
- **FR-006**: The component that evaluates the board MUST NOT know which ruleset
  it is evaluating. Adding a ruleset MUST NOT require changing it.
- **FR-007**: The board MUST be evaluated against the ruleset to determine both
  conflicts and completion. Completion MUST mean every cell is filled with no
  constraint violated, not comparison against a stored answer.

**Playing**

- **FR-008**: A player MUST be able to enter a value from 1 to 9 into any cell
  they are permitted to change.
- **FR-009**: A player MUST be able to clear a value they entered.
- **FR-010**: The site MUST indicate which cell the player is currently acting
  on.
- **FR-011**: Every action a player can take MUST be possible by keyboard, by
  pointer, and by touch, with no action reachable by only one of them, per
  constitution Principle IX.
- **FR-012**: The grid MUST be usable at 320px width without horizontal
  scrolling.

**Conflicts and completion**

- **FR-013**: When a value violates a constraint, the cells involved MUST be
  marked as conflicting.
- **FR-014**: When a conflict is resolved, the marking MUST clear.
- **FR-015**: Conflicts MUST be distinguishable by something other than colour
  alone.
- **FR-016**: When the board is complete and violates no constraint, the player
  MUST be told the puzzle is solved.

**Progress**

- **FR-017**: A puzzle in progress MUST be saved in the browser and restored when
  the player returns to it, per constitution Principle VI.
- **FR-018**: Saving MUST NOT require the player to take any action.
- **FR-019**: Progress MUST be stored per puzzle, so that returning to an earlier
  puzzle restores that puzzle's own entries.
- **FR-020**: The site MUST retain progress for at most 10 puzzles, discarding
  the least recently played beyond that, per constitution Principle VI.
- **FR-021**: Stored progress MUST carry a version identifier, and every version
  ever released MUST remain loadable, per constitution Principle V.

**Starting another puzzle**

- **FR-022**: A player MUST be able to start a different puzzle from the curated
  set.
- **FR-023**: Starting a different puzzle MUST NOT discard progress on the one
  being left.

### Key Entities

- **Puzzle**: One of the 20 curated Sudoku boards. Has an identifier stable
  across releases, a set of fixed cells with their values, and exactly one
  solution. Ships as data, not as code.
- **Ruleset**: A named set of constraints describing what makes a board valid.
  Classic Sudoku is one: all-different across each row, each column, and each
  three-by-three box. Expressed as data over cell sets.
- **Constraint**: One rule applied to a set of cells — for classic Sudoku, "these
  nine cells must all differ". The unit the board evaluator understands.
- **Progress**: A player's entries in one puzzle, plus whether it is solved.
  Belongs to exactly one puzzle, lives in the browser, and carries a version
  identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can complete a full Sudoku from first load to solved
  without instruction.
- **SC-002**: 100% of the 20 curated puzzles have exactly one solution.
- **SC-003**: Every action needed to solve a puzzle can be performed using only
  the keyboard, and again using only a pointer, and again using only touch.
- **SC-004**: Entering a conflicting value marks it within one action — the
  player never has to do anything extra to find out.
- **SC-005**: After filling cells and reloading, 100% of the player's entries are
  still present.
- **SC-006**: After playing a second puzzle and returning to the first, 100% of
  the first puzzle's entries are still present.
- **SC-007**: The grid is fully usable at 320px width, with no horizontal
  scrolling and every cell reachable.
- **SC-008**: A conflict is identifiable in a greyscale screenshot.

## Assumptions

- **Generation is out of scope.** The 20 puzzles are curated data. Generating
  puzzles, rating difficulty, and verifying uniqueness at runtime belong to a
  later feature.
- **Sharing is out of scope.** No links, no encoded puzzle state in the URL.
  Constitution Principle V still binds what this feature does store, which is why
  stored progress carries a version identifier.
- **Classic Sudoku only.** One ruleset. The point of expressing it as data is
  that adding variants later requires no engine change — not that variants exist
  now.
- **No accounts, no sync.** Progress is local to one browser on one device, as
  Principle IV requires.
- **Difficulty is not modelled.** The curated puzzles may vary in difficulty, but
  nothing labels, sorts, or filters by it.
- **No solving assistance.** No hints, no auto-fill, no pencil marks, no undo
  history. Each is defensible and each is a separate feature.
- **Accessibility posture inherited.** Colourblind-safe conflict marking is
  required by FR-015 because it is free at design time; screen reader support is
  supported where free but does not constrain other decisions, per Principle IX.

## Clarifications Needed

- **[NEEDS CLARIFICATION: How is a curated puzzle's single solution verified, and
  by whom?]** Principle II requires every puzzle presented to have exactly one
  solution, and requires mechanical verification for generated puzzles. These are
  curated rather than generated, and Principle VIII forbids tests that a player
  could not perform — so a solver-based uniqueness test does not obviously fit.
  The options differ substantially in work: verify once by hand outside the
  repository and trust the data; build a solver in this feature purely to check
  the curated set; or defer verification to the generation feature that will need
  a solver anyway.
- **[NEEDS CLARIFICATION: When a player asks for a new puzzle, what happens to
  the one they were on?]** FR-023 says progress is not discarded, but not how the
  player gets back. Options range from no way back at all (progress is retained
  but unreachable, which makes FR-019 untestable), to a list of puzzles in
  progress, to simply cycling through the set in order. This determines whether
  this feature needs any navigation surface at all.
