# Contract: Annotation kinds

What a kind must supply to join the registry, and what the rest of the site may
assume about every kind. This is the contract FR-007 rests on.

## A kind supplies

| Piece | Obligation |
|---|---|
| `id` | Permanent. It appears in stored progress, so reusing it would reinterpret saved boards |
| `empty()` | The payload meaning "nothing here". Used to decide whether a cell carries the kind at all |
| `toggle(payload, input, allHaveIt)` | Returns the new payload. `allHaveIt` is computed across the whole selection, never per cell (FR-022) |
| `parse(raw, ruleset)` | Reads a stored payload, dropping anything invalid rather than throwing |
| `render(cell, payload)` | Draws it. The one part that cannot be generic |

## The site may assume

- **Kinds are independent.** Changing one never alters another (FR-004). No kind
  may read or write another's payload.
- **Kinds never affect the board.** The value passed to `evaluate` contains
  givens and entries only (FR-005). A kind that needed to influence conflicts
  would not be an annotation.
- **Unknown kinds are ignored, not fatal.** A stored document naming a kind this
  release does not have loses that data and keeps the rest.
- **Given cells accept `colour` but not `centre` or `corner`** (FR-006). A kind
  declares which it is; the default is to refuse given cells.

## Toggling across a selection

One rule, and it is deliberately computed once for the whole selection rather
than per cell:

```text
allHaveIt = every writable selected cell already carries this input
for each writable selected cell:
    payload = allHaveIt ? remove(input) : add(input)
```

Given cells are excluded from both the test and the change (EC-001), so a
selection that mixes given and writable cells behaves as though the given ones
were not selected.

## Erase is not a kind

Erase walks layers — value, then marks, then colour — and chooses the layer once
for the whole selection (FR-025). It is therefore a operation over kinds rather
than one of them, and it ignores the current mode (FR-041).

```text
if any writable selected cell holds a value      → clear values
else if any holds a centre or corner mark        → clear both, everywhere
else                                             → clear colour
```

Each press re-evaluates, so repeated presses walk the whole selection down
together.
