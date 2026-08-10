import type { Game, Mode } from '../game/state.js';
import { CENTRE, CORNER } from '../game/annotations/marks.js';
import { COLOUR } from '../game/annotations/colour.js';
import { palettes, type PaletteId } from '../game/palettes.js';

/**
 * The number pad: a three-by-three grid of digits, an erase key, and the mode
 * controls (003 FR-027 to FR-029).
 *
 * Two rules hold the layout together. Nothing changes size or position when the
 * mode changes — only what the controls *contain* changes (003 FR-053). And the
 * controls show rather than tell: a mode button draws where its digits will
 * land, and the palette control draws the colours it switches to (003 FR-054).
 */

const MODES: readonly { id: Mode; key: string; name: string }[] = [
  { id: 'value', key: 'z', name: 'Value' },
  { id: CENTRE, key: 'x', name: 'Centre marks' },
  { id: CORNER, key: 'c', name: 'Corner marks' },
  { id: COLOUR, key: 'v', name: 'Colour' },
];

/** A miniature cell showing where this mode's digits land (003 FR-054). */
function modePreview(id: Mode): HTMLElement {
  const preview = document.createElement('span');
  preview.className = 'preview';
  preview.setAttribute('aria-hidden', 'true');

  if (id === 'value') {
    preview.classList.add('preview-value');
    preview.textContent = '5';
  } else if (id === CENTRE) {
    preview.classList.add('preview-centre');
    preview.textContent = '123';
  } else if (id === CORNER) {
    preview.classList.add('preview-corner');
    for (const slot of ['tl', 'tr', 'bl', 'br']) {
      const dot = document.createElement('i');
      dot.className = `pip pip-${slot}`;
      dot.textContent = '1';
      preview.append(dot);
    }
  } else {
    preview.classList.add('preview-colour');
  }
  return preview;
}

/** Nine swatches of a palette, small — the control shows its own colours. */
function palettePreview(palette: PaletteId): HTMLElement {
  const strip = document.createElement('span');
  strip.className = 'strip';
  strip.setAttribute('aria-hidden', 'true');
  for (const entry of palettes[palette]) {
    const chip = document.createElement('i');
    chip.className = 'chip';
    chip.style.setProperty('--chip', entry.colour);
    strip.append(chip);
  }
  return strip;
}

export function renderPad(root: HTMLElement, game: Game, onChange: () => void): void {
  root.replaceChildren();

  const keys = document.createElement('div');
  keys.className = 'keys';
  keys.dataset.testid = 'keys';

  const swatches = palettes[game.palette];
  for (const [index, value] of game.ruleset.values.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'key';
    button.dataset.key = String(value);

    if (game.mode === COLOUR) {
      // The same nine keys, wearing colours. A digit still places the nth
      // colour, so the keyboard reaches them (003 FR-051, research.md D13).
      const swatch = swatches[index];
      button.classList.add('swatch');
      if (swatch) {
        button.dataset.swatch = swatch.id;
        button.style.setProperty('--swatch', swatch.colour);
      }
      button.setAttribute('aria-label', `Colour ${value}`);
    } else {
      button.textContent = String(value);
      button.setAttribute('aria-label', `Place ${value}`);
    }

    button.addEventListener('click', () => {
      game.place(value);
      onChange();
    });
    keys.append(button);
  }
  root.append(keys);

  const side = document.createElement('div');
  side.className = 'side';

  const modes = document.createElement('div');
  modes.className = 'modes';
  modes.dataset.testid = 'modes';
  for (const mode of MODES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mode';
    button.dataset.mode = mode.id;
    button.append(modePreview(mode.id));
    button.setAttribute('aria-label', mode.name);
    button.setAttribute('aria-pressed', String(game.mode === mode.id));
    button.setAttribute('aria-keyshortcuts', mode.key);
    if (game.mode === mode.id) button.classList.add('active');
    button.addEventListener('click', () => {
      game.mode = mode.id;
      onChange();
    });
    modes.append(button);
  }
  side.append(modes);

  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'mode erase';
  erase.dataset.key = 'erase';
  erase.textContent = 'Erase';
  erase.setAttribute('aria-label', 'Erase the selected cells');
  erase.addEventListener('click', () => {
    game.place('erase');
    onChange();
  });
  side.append(erase);
  root.append(side);

  // Always present, so the pad does not resize when the mode changes
  // (003 FR-053). Inert unless colour mode is active.
  const palette = document.createElement('button');
  palette.type = 'button';
  palette.className = 'palette-toggle';
  palette.dataset.testid = 'palette';
  palette.append(palettePreview(game.palette === 'light' ? 'dark' : 'light'));
  palette.setAttribute(
    'aria-label',
    `Switch to the ${game.palette === 'light' ? 'dark' : 'light'}-digit palette`,
  );
  palette.disabled = game.mode !== COLOUR;
  palette.addEventListener('click', () => {
    game.palette = game.palette === 'light' ? 'dark' : 'light';
    onChange();
  });
  root.append(palette);
}
