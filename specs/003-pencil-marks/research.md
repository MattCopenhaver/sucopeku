# Phase 0 Research: Pencil Marks and Multi-Cell Selection

Decisions taken before design, with the reasoning that produced them.

---

## D1. Annotations are a registry of kinds, not three hardcoded fields

**Decision**: Model annotations as `kind → (cell → payload)`, where the set of
kinds is a registry. Centre marks and corner marks carry a set of values; colour
carries one identifier. Storage, saving, restoring, and clearing all iterate the
registry rather than naming the three kinds.

**Rationale**: FR-007 requires a fourth kind to arrive without reworking the
first three, and the player has said more kinds will come as rulesets do. This
is the same shape as feature 002's primitive registry, and it worked: adding a
constraint type there means adding a registry entry, not editing the evaluator.

The part that genuinely cannot be generic is *rendering* — a set of digits in
the middle of a cell looks nothing like a background colour. So the registry
carries the data handling, and each kind supplies its own renderer. That is the
honest boundary: adding a kind means writing how it looks, and nothing else.

**Alternatives considered**: Three named fields on the cell. Simpler today and
the obvious first instinct, but every future kind would touch save, load, erase,
eviction, and the clear-on-solve path. Rejected because FR-007 says so and
because feature 002 already demonstrated the registry paying off.

---

## D2. Selection is a set plus an anchor

**Decision**: Interaction state becomes `{ selection: Set<cell>, anchor, cursor,
mode, palette }`. The anchor is the cell a range extends *from* — the last cell
chosen without shift. The cursor is where the keyboard currently *is*.

**Amended during implementation**: this originally named the anchor alone. Two
tests then failed in the same way — a second shift+arrow left the selection the
same size. A range needs a fixed end and a moving one, and with only the anchor
every extension recomputes from the same origin to the same place. Recorded
because the omission is not obvious from reading the requirement: FR-018 says
"extend", and extending sounds like one piece of state until you try it.

**Rationale**: FR-018 requires shift plus arrows to extend rather than move,
which is meaningless without knowing what it extends *from*. Holding the anchor
separately is what makes "shift-down then shift-up" return to where it started
rather than drifting.

**Cost, stated plainly**: this replaces feature 002's `selectedCell: number |
null`, which every part of the UI reads. That is the real work in this feature —
pencil marks are almost incidental by comparison. Research D7 of feature 002
described interaction state as "one field"; it becomes four, and the reason is
recorded here rather than discovered in a diff.

---

## D3. Drag uses Pointer Events with explicit hit-testing

**Decision**: One set of handlers on the grid using `pointerdown`,
`pointermove`, and `pointerup`. Mouse, touch, and pen arrive through the same
path. The grid sets `touch-action: none` so a drag does not scroll the page.

Cells are identified during a drag by `document.elementFromPoint`, not by
`pointerenter` on each cell.

**Rationale**: the second half matters and is easy to get wrong. Once a pointer
is captured — which happens implicitly on touch — every subsequent event
delivers to the element where the drag *started*. `pointerenter` on the other
cells never fires, so a drag would select exactly one cell and appear broken on
touch while working on a mouse. Hit-testing the coordinates avoids that
entirely, and behaves identically for all three input types, which is what
FR-016 and SC-007 need.

`touch-action: none` is what satisfies EC-002. It must be scoped to the grid: on
the whole page it would break scrolling to the number pad on a short screen.

**Alternatives considered**: `mousedown`/`mousemove` plus a separate
`touchstart`/`touchmove` pair. Rejected — two code paths for one behaviour is
exactly the divergence that made input parity a constitutional principle, and
feature 002 already found three defects living in that gap.

---

## D4. Modes switch with dedicated keys, not modifiers

**Decision**: Four mode buttons, plus the keys `z` (value), `x` (centre), `c`
(corner), and `v` (colour) to switch between them. The keys switch the mode;
they do not place anything. Modifier-plus-digit accelerators are deliberately
not included.

**Rationale**: FR-011 says a digit press acts on the current mode and no other,
and FR-012 says the mode persists. A modifier accelerator would be a second way
to place a mark, which is precisely the two-models-wearing-one-name problem that
feature 002's revision existed to remove. One model: choose a mode, press
digits.

`z`/`x`/`c`/`v` are adjacent on the bottom row, do not collide with digits, and
leave arrow keys and Backspace as they were. They are a shortcut for pressing
the mode buttons, so FR-010 parity is satisfied by the buttons themselves rather
than by the keys.

**Alternatives considered**: the convention used by several established Sudoku
sites — shift plus digit for corner, control plus digit for centre. Familiar to
experienced players and genuinely faster. Rejected for this feature because it
makes the mode ignorable, and a mode that can be bypassed will drift out of sync
with what the pad displays. Worth revisiting once the mode model has proven
itself.

---

## D5. Palettes are defined by contrast, and the site has two themes

**Decision**: Two palettes of nine. The *light-digit* palette holds saturated,
darker colours; the *dark-digit* palette holds pale tints. Each colour is chosen
so its own digit treatment reaches a contrast ratio of at least 4.5:1 against
it, and every colour is distinguishable from both `--paper` values.

**The correction worth recording**: the feature was described as working against
"our black background". The site is not black — `style.css` defines a light
theme by default and switches to dark only under `prefers-color-scheme: dark`.
Every colour must therefore work in both themes. Since a cell's background is
the colour itself, the digit treatment is fixed by the palette rather than by
the theme, which is what makes this tractable: a light-digit colour renders
light digits in either theme.

What the theme still affects is the *uncoloured* grid around it, so colours must
also be distinguishable from `#fdfdfb` and from `#16171a`. Pure white and near
black are therefore excluded from both palettes.

**Alternatives considered**: one palette of nine with automatic digit colour
chosen by luminance. Fewer colours to pick and no palette control needed —
but the player asked for eighteen, and automatic contrast selection lands
unpredictably in the middle of the range, which is where legibility is worst.

---

## D6. Corner marks go in the corners, and nine share eight slots

**Decision**: Corner marks occupy the eight perimeter positions of the cell —
four corners first, then the four edge midpoints. The middle is never used. A
ninth mark shares the top-left position rather than claiming a ninth slot.

**Superseded 2026-08-09.** This originally put corner marks along the top edge,
up to five, and the bottom edge, up to four. The reasoning was sound and the
result was wrong: the arrangement guaranteed no collision with centre marks, but
it stopped looking like corner marks at all, which is the entire point of the
notation. The player named it on first play — *"the corner pencilmarks aren't
going in the corners."*

The original problem was real: eight perimeter slots, nine possible values. The
answer is to let one slot hold two digits, not to invent a layout. Nine corner
marks in one cell says almost nothing anyway — a player who has ruled out
nothing is not recording it — so the crowded case is the one worth degrading.

**What survives from the first version**: the middle stays clear, so centre and
corner marks still never collide (US3 scenario 2). That guarantee was the good
half of the original decision and it is kept.

**Amended after a second play**: doubling a slot up reads as a typo rather than
a notation, so the nine-mark case gets the old layout back as a special case —
five spread along the top edge, four along the bottom. Eight or fewer still use
the corners. The exception is worth it because it applies only where the corner
arrangement had already stopped working.

---

## D7. Stored progress moves to version 2 and discards version 1

**Decision**: The document version becomes 2 and gains annotations. A document
at version 1 is discarded whole, exactly as an unrecognised version is today.
No migration code is written.

**Rationale**: constitution 3.0.0 makes formats provisional before Sucopeku 1.0
provided failure is graceful, and the player chose discarding over upgrading
with that explicitly in mind. The existing code already discards anything whose
version it does not recognise (feature 002's `progress.ts`), so this decision
costs one changed constant and no new paths — the graceful failure required by
EC-005 is behaviour that already exists and is already tested.

---

## D8. Testing the touch drag, and what cannot be tested

**Decision**: Drag selection is driven in tests by dispatching pointer events
with `pointerType: 'touch'`, which exercises the real handlers. The *scrolling*
half of SC-007 is validated by hand.

**Rationale**: this is worth being precise about rather than discovering at
acceptance. Playwright can synthesise pointer input, so "dragging across four
cells selects four cells" is fully testable on all three browsers. Whether the
page also scrolled is a browser behaviour driven by `touch-action`, and the
harness does not reliably report it.

So SC-007 splits: the selection half is covered by the suite; the
did-not-scroll half joins the small list of things a person checks on a real
device, alongside feature 002's offline validation. Naming it now keeps it from
being quietly assumed later.

---

## D9. Marks are hidden by a value, never deleted

**Decision**: A cell holds its value and its annotations independently.
Rendering decides which to show: a value wins the middle of the cell, and centre
marks are simply not drawn while it is there. Erasing the value draws them
again.

**Rationale**: FR-023 and FR-024 require exactly this, and it falls out of
keeping the two in separate fields — there is no clearing step to write and none
to forget. It also means FR-040 needs no code at all: a solved board is one
where every cell has a value, so annotations are already hidden by the ordinary
rule and already intact underneath.

---

## D12. Marks are sized by how many there are

**Decision**: Centre marks render at a comfortable size when there are few and
shrink as they multiply. Values render larger than any mark, so a real answer is
never mistaken for a note.

**Rationale**: a fixed size has to be chosen for the worst case, and the worst
case is rare. Sizing for nine marks makes the common case — two or three
candidates — needlessly tiny, which the player hit immediately: *"should be
larger and more visible until they run out of space, then shrink."*

This is also what makes SC-005 survivable. That criterion knowingly accepts
digits near 6px in a fully loaded cell at 320px; it says nothing about the cell
holding three marks, which is what a player actually looks at most of the time.

---

## D13. Colour is placed by digit, like everything else

**Decision**: In colour mode the digits 1 to 9 place the nine colours of the
active palette. The swatches are the same nine keys, wearing colours.

**Rationale**: FR-011 says a digit press acts on the current mode. Colour was
the one mode where that was untrue — the swatches were clickable and the digits
did nothing, so colour was the only mode a keyboard could not reach. The player
found it before the tests did, which is the tests' fault: FR-010 was asserted
for the mode *buttons* and never for what the mode then does.

**The palette control shows colours rather than the words "light digits".** Two
rows of swatches are self-describing; the words describe an implementation
detail — which treatment the digits get — that the player has no reason to hold
in their head.

---

## D11. The theme is chosen explicitly, and stored apart from progress

**Decision**: A theme control cycles through three positions — light, dark, and
following the device — writing `light` or `dark` to its own storage key and
*removing* the key for the third. With nothing stored, the site follows
`prefers-color-scheme` exactly as it does now.

Absence is the third state rather than a stored `"auto"`, which is what makes
the default and the chosen-then-released case identical instead of merely
equivalent. A theme change is announced to other tabs through the same storage
event progress already uses (FR-050). The choice is applied by a
`data-theme` attribute on the root element, and the existing custom properties
are redefined under it.

**Rationale**: the theme became load-bearing in this feature and nowhere else.
Eighteen colours must be distinguishable from the grid on both grounds, and
SC-009 asks that this be checkable quickly — which it is not when checking means
changing an operating system setting mid-test.

**Why a separate key**: FR-048. Progress is versioned and, in this very feature,
discarded on a format change; it is also evicted per puzzle beyond ten. A
preference that vanished because a puzzle aged out, or because the save format
moved, would be a bug that looked like forgetfulness. Storing it apart makes
both impossible rather than unlikely.

**Why an attribute rather than swapping a stylesheet**: the media query already
defines the dark values. Adding `:root[data-theme='dark']` alongside it reuses
those definitions, and the no-choice case keeps working with no JavaScript at
all — which matters because the theme applies before the game has loaded.

**Alternatives considered**: storing the choice inside the progress document.
One fewer key, but it inherits eviction and format discarding, both of which
FR-048 exists to prevent.

---

## D10. What this feature does not touch

Recorded so the blast radius is a claim that can be checked rather than an
assumption.

The constraint engine is unchanged. `evaluate` receives a board of values, and
FR-005 keeps annotations out of it, so conflict marking and solved detection
behave exactly as before — which is what SC-008 asserts.

The ruleset format is unchanged. Mark digits come from `ruleset.values`, which
already exists.

Addressing is unchanged. Annotations live in stored progress, not in the URL,
so links stay short and a shared link still carries only a puzzle identifier.
