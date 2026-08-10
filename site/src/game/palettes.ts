/**
 * The two colour palettes (003 FR-031, contracts/palette.md).
 *
 * Each entry's identifier is permanent — it is written into stored progress, so
 * reusing one would recolour saved boards.
 *
 * The digit treatment belongs to the palette, not to the theme. A `light`
 * palette colour renders light digits whether the site is in light or dark
 * mode, which is what lets one set of colours work on both grounds
 * (research.md D5). Every colour is chosen to clear 4.5:1 against its own
 * treatment and to stay distinguishable from both theme backgrounds, #fdfdfb
 * and #16171a — so no near-white and no near-black.
 */

export type PaletteId = 'light' | 'dark';

export interface PaletteEntry {
  readonly id: string;
  readonly palette: PaletteId;
  readonly colour: string;
}

/** Saturated and darker: digits on these are rendered light. */
const lightDigit: readonly PaletteEntry[] = [
  { id: 'l1', palette: 'light', colour: '#8c2f39' },
  { id: 'l2', palette: 'light', colour: '#a34d1a' },
  { id: 'l3', palette: 'light', colour: '#6b5a10' },
  { id: 'l4', palette: 'light', colour: '#2f6b3a' },
  { id: 'l5', palette: 'light', colour: '#116b63' },
  { id: 'l6', palette: 'light', colour: '#1f5b8c' },
  { id: 'l7', palette: 'light', colour: '#3b3f8f' },
  { id: 'l8', palette: 'light', colour: '#6b2f7a' },
  { id: 'l9', palette: 'light', colour: '#4a4a4a' },
];

/** Pale tints: digits on these are rendered dark. */
const darkDigit: readonly PaletteEntry[] = [
  { id: 'd1', palette: 'dark', colour: '#f6c6c9' },
  { id: 'd2', palette: 'dark', colour: '#f7d5b0' },
  { id: 'd3', palette: 'dark', colour: '#f0e6a8' },
  { id: 'd4', palette: 'dark', colour: '#c3e6c8' },
  { id: 'd5', palette: 'dark', colour: '#b8e4e0' },
  { id: 'd6', palette: 'dark', colour: '#bcd8f0' },
  { id: 'd7', palette: 'dark', colour: '#cdcdf2' },
  { id: 'd8', palette: 'dark', colour: '#e6c8ee' },
  { id: 'd9', palette: 'dark', colour: '#d6d6d6' },
];

export const palettes: Readonly<Record<PaletteId, readonly PaletteEntry[]>> = {
  light: lightDigit,
  dark: darkDigit,
};

const byId = new Map<string, PaletteEntry>(
  [...lightDigit, ...darkDigit].map((entry) => [entry.id, entry]),
);

export function isPaletteEntry(id: string): boolean {
  return byId.has(id);
}

export function paletteEntry(id: string): PaletteEntry | undefined {
  return byId.get(id);
}
