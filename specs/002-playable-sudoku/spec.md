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
2. **Given** a digit selected on the number pad, **When** the player chooses an
   empty cell, **Then** that digit appears in the cell and stays selected.
3. **Given** a selected cell, **When** the player types a digit, **Then** that
   digit appears in the cell and becomes the selected digit.
4. **Given** a cell the player filled and erase selected, **When** they choose
   that cell, **Then** the cell is empty again.
5. **Given** a cell that came with the puzzle, **When** the player attempts to
   change it, **Then** its value does not change.
6. **Given** a grid one correct value from completion, **When** that value is
   entered, **Then** the puzzle is shown as solved and the grid locks.
7. **Given** a solved, locked puzzle, **When** the player uses the unlock
   control, **Then** they can enter and erase values again.

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

Each puzzle has its own address, so returning is a matter of opening that link
again — from a bookmark, from history, or by being given the same puzzle another
day.

**Independent Test**: Fill several cells, reload the page, and confirm those
cells still hold their values.

**Acceptance Scenarios**:

1. **Given** a puzzle with several cells filled, **When** the page is reloaded,
   **Then** those cells still hold the player's values.
2. **Given** a puzzle in progress, **When** the player returns after closing the
   browser entirely, **Then** their progress is still there.
3. **Given** a solved puzzle, **When** the player returns, **Then** it is still
   shown as solved.
4. **Given** progress on a puzzle, **When** the player opens that puzzle's
   address directly, **Then** the puzzle loads with their entries intact.
5. **Given** progress on a puzzle, **When** the player starts a different puzzle
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

1. **Given** a player on any puzzle, **When** they use the new-puzzle control,
   **Then** a different puzzle from the curated set is shown, at its own address.
2. **Given** a player who has moved to a new puzzle, **When** they go back in
   their browser, **Then** the previous puzzle is shown with its progress.
3. **Given** a new puzzle has been started, **When** the player opens the
   previous puzzle's address, **Then** its progress is intact.
4. **Given** the player has played several puzzles, **When** they ask for another,
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
- **EC-010**: When an address names a puzzle identifier that is malformed or
  unknown, the player MUST be given a working puzzle rather than an error.
- **EC-004**: When stored progress is unreadable or corrupt, the player MUST be
  given a working puzzle. Losing progress is acceptable; failing to start is not.
- **EC-005**: When a stored entry conflicts with the puzzle's fixed values —
  possible only through tampering or a format change — the puzzle MUST still
  load, showing the conflict rather than refusing to open.
- **EC-006**: When the browser denies or exhausts storage, the puzzle MUST remain
  fully playable for the session. Persistence is an enhancement on top of a game
  that already works.
- **EC-007**: When a player unlocks a solved puzzle and then clears a value, the
  puzzle MUST stop being shown as solved rather than holding a stale solved
  state. Completing it again MUST show it as solved again.
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
- **FR-009**: The site MUST present a number pad of the digits 1 to 9 that is
  visible whenever a puzzle is shown.
- **FR-010**: Entry MUST be digit-first: the player selects a digit, and then
  places it by choosing a cell. The selected digit MUST remain selected after
  placement, so several cells can be filled with the same digit in succession.
- **FR-011**: The site MUST indicate which digit is currently selected.
- **FR-012**: Typing a digit while a cell is selected MUST both select that digit
  and place it in that cell. This is a shortcut over the same model, not a second
  one: every action it performs is also reachable from the number pad.
- **FR-013**: A player MUST be able to clear a value they entered.
- **FR-014**: The number pad MUST include an erase key, selectable like a digit.
  While erase is selected, choosing a cell clears the player's value in it.
  Pressing Backspace or Delete with a cell selected MUST clear that cell.
- **FR-015**: Choosing a cell that holds no player value while erase is selected
  MUST do nothing, and MUST NOT report an error.
- **FR-016**: The site MUST indicate which cell the player is currently acting
  on.
- **FR-017**: Every action a player can take MUST be possible by keyboard, by
  pointer, and by touch, with no action reachable by only one of them, per
  constitution Principle IX.
- **FR-018**: The grid MUST be usable at 320px width without horizontal
  scrolling.

**Conflicts and completion**

- **FR-019**: When a value violates a constraint, the cells involved MUST be
  marked as conflicting.
- **FR-020**: When a conflict is resolved, the marking MUST clear.
- **FR-021**: Conflicts MUST be distinguishable by something other than colour
  alone.
- **FR-022**: When the board is complete and violates no constraint, the site
  MUST show that the puzzle is solved, visibly enough that a person does not have
  to inspect individual cells to know.
- **FR-023**: On solving, the grid MUST lock: while locked, no value can be
  entered or erased.
- **FR-024**: The site MUST present a control that unlocks a solved puzzle for
  further editing. Once unlocked it behaves as any puzzle in progress, and is
  shown as solved again if completed again.
- **FR-025**: Whether a puzzle is solved, and whether it has been unlocked, MUST
  be part of its stored progress, so returning restores what the player left.

**Each puzzle has an address**

- **FR-026**: Every curated puzzle MUST have its own address, derived from a
  puzzle identifier that is stable across releases.
- **FR-027**: Opening a puzzle's address MUST load that puzzle. If the player has
  progress on it, that progress MUST be restored.
- **FR-028**: Arriving without naming a puzzle MUST select one at random and
  place the player at that puzzle's address, so that reloading keeps them on the
  same puzzle rather than reshuffling.
- **FR-029**: An address naming a puzzle that does not exist MUST NOT produce an
  error. The player MUST be given a working puzzle.
- **FR-030**: The address MUST carry only a puzzle identifier, not an encoded
  board. The puzzles ship with the site.

**Progress**

- **FR-031**: A puzzle in progress MUST be saved in the browser and restored when
  the player returns to it, per constitution Principle VI.
- **FR-032**: Saving MUST NOT require the player to take any action.
- **FR-033**: Progress MUST be stored against the puzzle's identifier, so that
  reaching a puzzle by any route — its address, or being given it at random —
  restores that puzzle's own entries.
- **FR-034**: The site MUST retain progress for at most 10 puzzles, discarding
  the least recently played beyond that, per constitution Principle VI.
- **FR-035**: Stored progress and puzzle addresses MUST each carry a version
  identifier. Before Sucopeku 1.0 they MAY break: state that can no longer be
  read MUST be discarded gracefully rather than causing an error, per
  constitution Principle V as amended in 3.0.0.

**Starting another puzzle**

- **FR-036**: The site MUST present a single control that starts a different
  puzzle, chosen at random from the curated set, and moves the player to that
  puzzle's address.
- **FR-037**: Because each puzzle has its own address, returning to a previous
  puzzle MUST require no navigation surface of its own. Browser history is
  sufficient, and no list of puzzles is built in this feature.
- **FR-038**: Starting a different puzzle MUST NOT discard progress on the one
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
- **SC-005**: A solved puzzle is identifiable without inspecting individual
  cells, and no value can be entered or erased until it is unlocked.
- **SC-006**: After filling cells and reloading, 100% of the player's entries are
  still present.
- **SC-007**: After playing a second puzzle and returning to the first, 100% of
  the first puzzle's entries are still present.
- **SC-008**: The grid is fully usable at 320px width, with no horizontal
  scrolling and every cell reachable.
- **SC-009**: A conflict is identifiable in a greyscale screenshot.

## Assumptions

- **Generation is out of scope.** The 20 puzzles are curated data. Generating
  puzzles and rating difficulty belong to a later feature.
- **Uniqueness is verified once, outside the repository.** Each curated puzzle is
  confirmed to have exactly one solution before it ships, and how that was done is
  recorded alongside the data. No solver is built here — that satisfies Principle
  II for fixed data without dragging the generation feature's hardest piece
  forward.
- **Addresses name a puzzle; they do not encode one.** A link carries a puzzle
  identifier, and the board itself ships with the site. Sharing an arbitrary or
  generated puzzle — which requires encoding a board into a link — belongs to the
  generation feature.
- **Formats may break before 1.0.** Constitution 3.0.0 makes stored progress and
  addresses provisional until 1.0 is declared, provided failures are graceful.
  This is what allows persistence to be built now without committing forever to a
  shape chosen before variants and generation exist.
- **Classic Sudoku only.** One ruleset. The point of expressing it as data is
  that adding variants later requires no engine change — not that variants exist
  now.
- **No accounts, no sync.** Progress is local to one browser on one device, as
  Principle IV requires.
- **Difficulty is not modelled.** The curated puzzles may vary in difficulty, but
  nothing labels, sorts, or filters by it.
- **No solving assistance.** No hints, no auto-fill, no undo history. Each is
  defensible and each is a separate feature.
- **Pencil marks are out of scope, but not designed out.** Marking candidate
  values in a cell belongs to a later feature. The digit-first input model was
  chosen partly because it accommodates them: with a digit already selected, a
  notes mode can mark several cells without reselecting. Nothing here should make
  that harder.
- **Accessibility posture inherited.** Colourblind-safe conflict marking is
  required by FR-021 because it is free at design time; screen reader support is
  supported where free but does not constrain other decisions, per Principle IX.

## Clarifications

### Session 2026-08-09

- Q: How does a player put a number into a cell on a touchscreen? → A: An
  always-visible number pad, and the interaction is digit-first: the player
  selects the number they want, then taps the cells to place it into. Chosen
  partly because it extends to pencil marks later — with a digit already held,
  a notes mode can mark several cells without reselecting.
- Q: On a keyboard, does the player also work digit-first, or can they move to a
  cell and type the number? → A: Digit-first is the shared model, but typing a
  digit while a cell is selected both selects that digit and places it. Parity
  holds because every keyboard action also exists on the pad; keyboard players
  simply get a shortcut rather than a separate mental model.
- Q: With entry being digit-first, how does a player clear a value? → A: An erase
  key on the number pad, selected like a digit and then applied to cells.
  Backspace and Delete do the same from the keyboard. Erase behaves as a tenth
  key rather than a new interaction concept, so it inherits input parity.
- Q: How does a player get a different puzzle, and where does that control live?
  → A: A single "new puzzle" control that picks a different one at random and
  moves the player to that puzzle's address. Returning to a previous puzzle needs
  no navigation of its own — browser history does it, because each puzzle already
  has an address.
- Q: When the player solves a puzzle, what changes on screen and can they keep
  editing? → A: A visible solved indication and the grid locks, plus an explicit
  control to unlock and keep editing. Locking makes the completed state
  unambiguous for storage and for tests; the unlock keeps the player in charge
  rather than shut out of their own board.

- Q: How is each curated puzzle's single solution verified, and by whom? → A:
  Verified once outside the repository, before the data ships. No solver is built
  in this feature; the puzzles are fixed, so one-time verification is real
  evidence rather than a standing promise.
- Q: When a player starts a different puzzle, how do they get back to the one they
  left? → A: Each puzzle has its own address. Returning means opening that link
  again — from a bookmark, from history, or by being given the same puzzle at
  random. No list or navigation surface is needed.
- Q: Does reloading reshuffle the puzzle? → A: No. Arriving without naming a
  puzzle selects one at random and places the player at that puzzle's address, so
  a reload keeps them where they were.
