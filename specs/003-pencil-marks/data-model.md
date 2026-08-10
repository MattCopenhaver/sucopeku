# Data Model: Pencil Marks and Multi-Cell Selection

Two things change shape: what a puzzle's progress contains, and what the
interaction state is. Nothing else in the model moves.

## Annotation kinds

An annotation kind is an entry in a registry (research.md D1). Each entry
declares what a cell's payload looks like and how to merge, toggle, and clear
it. The three shipped here:

| Kind | Payload | Toggle rule |
|---|---|---|
| `centre` | A set of values from `ruleset.values` | Add the digit unless every selected cell has it, then remove (FR-022) |
| `corner` | A set of values from `ruleset.values` | Same as centre |
| `colour` | One palette entry identifier | Apply, or remove if the cell already holds that exact colour (FR-033) |

Adding a fourth kind means adding a row here, a registry entry, and a renderer.
It must not mean touching the other three — that obligation is FR-007, and it is
the reason the table exists rather than three fields.

**Validation**: a payload value that is not in `ruleset.values`, or a colour
identifier not in either palette, is dropped on load rather than treated as
fatal. The same reasoning as a ruleset constraint addressing a cell outside the
geometry in feature 002: bad data must not stop the site starting.

## Stored progress, version 2

```text
sucopeku.progress
{
  v: 2,
  puzzles: {
    "<puzzleId>": {
      entries:     { "<cell>": value },
      annotations: {
        centre: { "<cell>": [values] },
        corner: { "<cell>": [values] },
        colour: { "<cell>": "<paletteEntryId>" }
      },
      solved:   boolean,
      unlocked: boolean,
      playedAt: epoch milliseconds
    }
  }
}
```

`annotations` is keyed by kind so that an unknown kind found in a stored
document can be ignored without disturbing the known ones — the same tolerance
the ruleset loader applies to unknown primitives.

**Version 1 is discarded, not upgraded** (FR-037, EC-005, research.md D7). The
existing loader already discards any version it does not recognise, so this is a
changed constant rather than a new code path.

**Eviction is unchanged**: ten puzzles, least recently played dropped. Notably,
annotations make a puzzle's record several times larger, which brings the
ten-puzzle cap closer to a real storage limit than it has ever been. EC-008
already requires play to continue when storage is exhausted, so the failure is
specified; it is simply more reachable now.

## Interaction state

Feature 002's research described this as "one field". It becomes four.

| Field | Type | Saved? |
|---|---|---|
| `selection` | `Set<cell>` | No (FR-020) |
| `anchor` | `cell \| null` | No |
| `cursor` | `cell \| null` | No |
| `mode` | `value \| centre \| corner \| colour` | No (FR-013) |
| `palette` | `light-digit \| dark-digit` | No (FR-043) |

`anchor` exists so shift plus arrows extends from a fixed point rather than
drifting (research.md D2). It is set by any selection change that is not an
extension.

`cursor` is where the keyboard currently is, and it moves while the anchor does
not. Both are needed: a range has a fixed end and a moving one, and using the
anchor for both makes the second shift+arrow recompute the same range so the
selection never grows. Found by test rather than by design — see Revisions.

None of it persists. On load: selection empty or the first writable cell, no
anchor, mode `value`, palette `light-digit`.

## Theme preference

Stored under its own key, not in the progress document (FR-048, research.md
D11).

```text
sucopeku.theme
"light" | "dark"          absent means follow the device
```

Three states, two of which are stored. Cycling to *follow the device* removes
the key rather than writing `"auto"`, so a player who has never chosen and a
player who has changed their mind reach byte-identical storage — one state, not
two that behave alike (research.md D11).

Deliberately outside `sucopeku.progress`: that document is versioned, is
discarded when the version moves, and evicts puzzles beyond ten. A preference
must survive all three. Anything unreadable falls back to the device setting
(EC-011).

## The board is unchanged

`evaluate` still receives givens overlaid with entries, and nothing else
(FR-005). Annotations are not part of the board, are not passed to the engine,
and cannot cause or clear a conflict. This is what SC-008 asserts and what keeps
this feature away from the part of the system Principle III protects.

## Cell rendering order

A cell draws, back to front: colour, then corner marks, then either the value or
the centre marks — never both (research.md D9).

Corner marks occupy the top edge up to five and the bottom edge up to four,
never the middle (research.md D6), so they coexist with whatever the middle
holds.
