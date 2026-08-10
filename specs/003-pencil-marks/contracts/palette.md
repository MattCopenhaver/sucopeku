# Contract: Colour palettes

## Shape

Two palettes, nine entries each (FR-031).

| Palette | Digits rendered | Colours are |
|---|---|---|
| `light-digit` | Light | Saturated and darker |
| `dark-digit` | Dark | Pale tints |

Each entry has a permanent identifier — it is stored in progress — and a colour
value.

## Obligations

- **Contrast**: every entry MUST reach at least 4.5:1 against its own palette's
  digit treatment (FR-032). This is measured, not judged.
- **Distinguishable from the grid**: every entry MUST be visibly different from
  both theme backgrounds, `#fdfdfb` and `#16171a`. The site is light by default
  and dark under `prefers-color-scheme`, so a colour that vanishes in either
  theme fails (research.md D5).
- **Distinguishable from each other**: within a palette, no two entries should
  be confusable at the size of a cell at 320px.
- **The digit treatment belongs to the palette, not the theme.** A `light-digit`
  colour renders light digits in either theme. This is what makes one set of
  colours work in both.

## Reaching the second nine

The pad keeps its three-by-three shape in colour mode and shows nine swatches. A
palette control switches which nine (FR-034). The control is visible without
interaction (FR-042) and is an ordinary focusable button, so keyboard, pointer,
and touch reach it without a new gesture.

The active palette resets to `light-digit` when a puzzle loads (FR-043).

## Applying

Applying a cell's current colour removes it (FR-033). Applying a different
colour replaces it — a cell holds at most one.
