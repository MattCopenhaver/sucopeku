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
function modePreview(id: Mode, palette: PaletteId): HTMLElement {
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
    // The same four positions, in the same order, that four real corner marks
    // would take — so the control shows the arrangement and not just the idea
    // of one (003 FR-054, research.md D6).
    for (const [index, slot] of ['tl', 'tr', 'bl', 'br'].entries()) {
      const pip = document.createElement('i');
      pip.className = `pip pip-${slot}`;
      pip.textContent = String(index + 1);
      preview.append(pip);
    }
  } else {
    // The nine colours in use, radiating from the centre. The control is also
    // the palette indicator, so it must show which nine (003 FR-056).
    preview.classList.add('preview-colour');
    const slice = 360 / palettes[palette].length;
    const stops = palettes[palette]
      .map((entry, i) => `${entry.colour} ${i * slice}deg ${(i + 1) * slice}deg`)
      .join(', ');
    preview.style.setProperty('--wheel', `conic-gradient(from -90deg, ${stops})`);
  }
  return preview;
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
    button.append(modePreview(mode.id, game.palette));
    const active = game.mode === mode.id;
    button.setAttribute(
      'aria-label',
      mode.id === COLOUR && active ? 'Colour — press again for the other palette' : mode.name,
    );
    if (mode.id === COLOUR) button.dataset.testid = 'palette';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-keyshortcuts', mode.key);
    if (active) button.classList.add('active');
    button.addEventListener('click', () => {
      chooseMode(game, mode.id);
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
}

/**
 * Choosing a mode, with one exception: choosing colour when colour is already
 * active switches palette instead (003 FR-056).
 *
 * Shared by the button and the keyboard so the two cannot diverge — the same
 * reason placement goes through one function.
 */
export function chooseMode(game: Game, mode: Mode): void {
  if (mode === COLOUR && game.mode === COLOUR) {
    game.palette = game.palette === 'light' ? 'dark' : 'light';
    return;
  }
  game.mode = mode;
}
