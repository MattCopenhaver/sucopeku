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

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === null) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function currentChoice(): ThemeChoice {
  return loadTheme();
}

export function cycleTheme(): ThemeChoice {
  const next = ORDER[(ORDER.indexOf(currentChoice()) + 1) % ORDER.length] ?? null;
  saveTheme(next);
  applyTheme(next);
  return next;
}

export function describeChoice(choice: ThemeChoice): string {
  if (choice === 'light') return 'Light';
  if (choice === 'dark') return 'Dark';
  return 'Auto';
}

/** Another tab changed the theme; follow it without a reload (003 FR-050). */
export function followOtherTabs(after: () => void): void {
  onThemeChange(() => {
    applyTheme(loadTheme());
    after();
  });
}

/** Applied before the game renders, so there is no flash of the wrong theme. */
export function initTheme(): void {
  applyTheme(loadTheme());
}
