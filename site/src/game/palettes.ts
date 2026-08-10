/**
 * The two colour palettes (003 FR-031, contracts/palette.md).
 *
 * Each entry's identifier is permanent — it is written into stored progress, so
 * reusing one would recolour saved boards.
 *
 * These are two sets of nine, and nothing more. They were once distinguished by
 * whether digits on them render light or dark; a cell may now hold colours from
 * both at once, so no per-palette treatment can exist. Legibility comes from
 * the digits carrying a halo of the page colour instead (003 FR-061), which is
 * what lets these be moderate mid-tones rather than extremes.
 *
 * Every colour still stays clear of both theme backgrounds, #fdfdfb and
 * #16171a, so none of them disappears into the grid in either theme
 * (research.md D5).
 */

export type PaletteId = 'light' | 'dark';

export interface PaletteEntry {
  readonly id: string;
  readonly palette: PaletteId;
  readonly colour: string;
}

/** The first nine: deeper mid-tones. */
const first: readonly PaletteEntry[] = [
  { id: 'l1', palette: 'light', colour: '#b4535c' },
  { id: 'l2', palette: 'light', colour: '#c2793f' },
  { id: 'l3', palette: 'light', colour: '#a08a34' },
  { id: 'l4', palette: 'light', colour: '#5b9163' },
  { id: 'l5', palette: 'light', colour: '#3f938c' },
  { id: 'l6', palette: 'light', colour: '#4b83ad' },
  { id: 'l7', palette: 'light', colour: '#6d70b4' },
  { id: 'l8', palette: 'light', colour: '#95609f' },
  { id: 'l9', palette: 'light', colour: '#7d7d7d' },
];

/** The second nine: lighter mid-tones, but not pastels. */
const second: readonly PaletteEntry[] = [
  { id: 'd1', palette: 'dark', colour: '#e0949a' },
  { id: 'd2', palette: 'dark', colour: '#e5ab77' },
  { id: 'd3', palette: 'dark', colour: '#d3c06d' },
  { id: 'd4', palette: 'dark', colour: '#96c49e' },
  { id: 'd5', palette: 'dark', colour: '#82c2bd' },
  { id: 'd6', palette: 'dark', colour: '#8fb6d6' },
  { id: 'd7', palette: 'dark', colour: '#a5a7d9' },
  { id: 'd8', palette: 'dark', colour: '#c199c9' },
  { id: 'd9', palette: 'dark', colour: '#adadad' },
];

export const palettes: Readonly<Record<PaletteId, readonly PaletteEntry[]>> = {
  light: first,
  dark: second,
};

const byId = new Map<string, PaletteEntry>([...first, ...second].map((entry) => [entry.id, entry]));

/** Stable display order, so adding a colour does not reshuffle the others
 *  (003 FR-060). */
const ORDER = new Map<string, number>([...first, ...second].map((entry, i) => [entry.id, i]));

export function paletteOrder(id: string): number {
  return ORDER.get(id) ?? Number.MAX_SAFE_INTEGER;
}

export function isPaletteEntry(id: string): boolean {
  return byId.has(id);
}

export function paletteEntry(id: string): PaletteEntry | undefined {
  return byId.get(id);
}
