import type { Game, Mode } from '../game/state.js';
import { CENTRE, CORNER } from '../game/annotations/marks.js';
import { COLOUR } from '../game/annotations/colour.js';
import { palettes } from '../game/palettes.js';

/**
 * The number pad: a three-by-three grid of digits, an erase key, and the mode
 * controls (003 FR-027, FR-028, FR-029).
 *
 * A key performs an action rather than entering a mode — the mode buttons do
 * that, and the active one is visible without interacting with anything
 * (003 FR-009).
 */

const MODES: readonly { id: Mode; label: string; key: string }[] = [
  { id: 'value', label: 'Value', key: 'z' },
  { id: CENTRE, label: 'Centre', key: 'x' },
  { id: CORNER, label: 'Corner', key: 'c' },
  { id: COLOUR, label: 'Colour', key: 'v' },
];

export function renderPad(root: HTMLElement, game: Game, onChange: () => void): void {
  root.replaceChildren();

  const keys = document.createElement('div');
  keys.className = 'keys';
  keys.dataset.testid = 'keys';

  if (game.mode === COLOUR) {
    // The pad keeps its shape in colour mode; only what fills it changes
    // (003 FR-034).
    for (const entry of palettes[game.palette]) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'key swatch';
      swatch.dataset.key = entry.id;
      swatch.style.setProperty('--swatch', entry.colour);
      swatch.setAttribute('aria-label', `Colour ${entry.id}`);
      swatch.addEventListener('click', () => {
        game.placeColour(entry.id);
        onChange();
      });
      keys.append(swatch);
    }
  } else {
    for (const value of game.ruleset.values) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'key';
      button.dataset.key = String(value);
      button.textContent = String(value);
      button.setAttribute('aria-label', `Place ${value}`);
      button.addEventListener('click', () => {
        game.place(value);
        onChange();
      });
      keys.append(button);
    }
  }
  root.append(keys);

  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'key erase';
  erase.dataset.key = 'erase';
  erase.textContent = 'Erase';
  // Erase is the one control that ignores the mode (003 FR-041).
  erase.setAttribute('aria-label', 'Erase the selected cells');
  erase.addEventListener('click', () => {
    game.place('erase');
    onChange();
  });
  root.append(erase);

  const modes = document.createElement('div');
  modes.className = 'modes';
  modes.dataset.testid = 'modes';
  for (const mode of MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode';
    button.dataset.mode = mode.id;
    button.textContent = mode.label;
    button.setAttribute('aria-pressed', String(game.mode === mode.id));
    button.setAttribute('aria-keyshortcuts', mode.key);
    if (game.mode === mode.id) button.classList.add('active');
    button.addEventListener('click', () => {
      game.mode = mode.id;
      onChange();
    });
    modes.append(button);
  }
  root.append(modes);

  if (game.mode === COLOUR) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mode palette-toggle';
    toggle.dataset.testid = 'palette';
    toggle.textContent = game.palette === 'light' ? 'Light digits' : 'Dark digits';
    toggle.setAttribute('aria-label', `Palette: ${toggle.textContent}. Switch.`);
    toggle.addEventListener('click', () => {
      game.palette = game.palette === 'light' ? 'dark' : 'light';
      onChange();
    });
    root.append(toggle);
  }
}
