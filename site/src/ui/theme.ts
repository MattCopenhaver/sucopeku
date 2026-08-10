import { loadTheme, onThemeChange, saveTheme, type ThemeChoice } from '../game/progress.js';

/**
 * Light, dark, or follow the device (003 FR-045).
 *
 * Three positions, two of which are stored: *follow the device* is the absence
 * of the key rather than a stored "auto". A player who never chose and one who
 * cycled back therefore reach identical storage — one state, not two that have
 * to be kept behaving alike (research.md D11).
 *
 * The choice is applied as `data-theme` on the root element. `style.css`
 * redefines the same custom properties under that attribute alongside the
 * existing media query, so with nothing stored the site still follows the
 * device with no script involved at all.
 */

const ORDER: readonly ThemeChoice[] = [null, 'light', 'dark'];

/**
 * The choice in memory, which is the source of truth for this session.
 *
 * Reading it back from storage each time looked tidier and broke the control
 * outright when storage is refused: the write is swallowed, the read returns
 * nothing, and every press cycles from the beginning — so the theme jumps to
 * light and stays there while the label never changes. Persistence is an
 * enhancement here exactly as it is for progress (003 FR-038, EC-008).
 */
let current: ThemeChoice = null;

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === null) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function currentChoice(): ThemeChoice {
  return current;
}

export function cycleTheme(): ThemeChoice {
  current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? null;
  saveTheme(current);
  applyTheme(current);
  return current;
}

export function describeChoice(choice: ThemeChoice): string {
  if (choice === 'light') return 'Light';
  if (choice === 'dark') return 'Dark';
  return 'Auto';
}

/** Another tab changed the theme; follow it without a reload (003 FR-050). */
export function followOtherTabs(after: () => void): void {
  onThemeChange(() => {
    current = loadTheme();
    applyTheme(current);
    after();
  });
}

/** Applied before the game renders, so there is no flash of the wrong theme. */
export function initTheme(): void {
  current = loadTheme();
  applyTheme(current);
}
