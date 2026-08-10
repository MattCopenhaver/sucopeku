import type { Entry, Game } from '../game/state.js';

/**
 * The number pad. Always visible while a puzzle is shown (FR-009), and the only
 * place every action is reachable from — which is what lets the keyboard be a
 * shortcut rather than a separate mechanism.
 *
 * A key performs an action; it does not enter a mode. There is nothing to show
 * as "currently selected" here, which is why the requirement asking for a digit
 * indicator was deleted rather than reworded.
 */
export function renderPad(root: HTMLElement, game: Game, onChange: () => void): void {
  root.replaceChildren();

  const keys: Entry[] = [...game.ruleset.values, 'erase'];

  for (const key of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === 'erase' ? 'key erase' : 'key';
    button.dataset.key = String(key);
    button.textContent = key === 'erase' ? 'Erase' : String(key);
    button.setAttribute(
      'aria-label',
      key === 'erase' ? 'Erase the selected cell' : `Place ${key} in the selected cell`,
    );

    button.addEventListener('click', () => {
      game.place(key);
      onChange();
    });

    root.append(button);
  }
}
