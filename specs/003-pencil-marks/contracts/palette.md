# Contract: Colour palettes

## Shape

Two palettes, nine entries each (FR-031).

Two sets of nine, and nothing more. They were once distinguished by whether
digits on them render light or dark; a cell may now hold colours from both at
once, so no per-palette treatment can exist.

Each entry has a permanent identifier — it is stored in progress — and a colour
value. Entries have a fixed order across both palettes, which is the order a
cell shows them in (FR-060).

## Obligations

- **Legibility**: digits MUST stay readable on every colour and on any
  combination of them (FR-032). This is achieved by the digits carrying a halo
  of the page colour (FR-061), not by choosing backgrounds that suit one digit
  colour — a cell split between several has no single suitable background.
- **Distinguishable from the grid**: every entry MUST be visibly different from
  both theme backgrounds, `#fdfdfb` and `#16171a`. The site is light by default
  and dark under `prefers-color-scheme`, so a colour that vanishes in either
  theme fails (research.md D5).
- **Distinguishable from each other**: within a palette, no two entries should
  be confusable at the size of a cell at 320px.
- **The digit treatment belongs to nothing.** Digits render in the page's ink
  colour with a halo of the page colour, in both themes and over every
  background. That is what allows a cell to mix colours at all.

## Reaching the second nine

The pad keeps its three-by-three shape in colour mode and shows nine swatches. A
palette control switches which nine (FR-034). The control is visible without
interaction (FR-042) and is an ordinary focusable button, so keyboard, pointer,
and touch reach it without a new gesture.

The active palette resets to `light-digit` when a puzzle loads (FR-043).

## Applying

A cell holds a *set* of colours, which makes it the same shape as centre and
corner marks and gives it their toggle rule for free: applying a colour the cell
already holds removes it and leaves the rest (FR-033).

Several colours split the cell radially, in palette order, so adding one does
not reshuffle those already there (FR-003, FR-060).
