import type { Game, Selection } from '../game/state.js';

/**
 * The number pad. Always visible while a puzzle is shown (FR-009), and the
 * only place every action is reachable from — which is what lets the keyboard
 * be a shortcut rather than a separate mechanism.
 */
export function renderPad(root: HTMLElement, game: Game, onChange: () => void): void {
  root.replaceChildren();

  const keys: Selection[] = [...game.ruleset.values, 'erase'];

  for (const key of keys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = key === 'erase' ? 'key erase' : 'key';
    button.dataset.key = String(key);
    button.textContent = key === 'erase' ? 'Erase' : String(key);
    button.setAttribute('aria-pressed', String(game.selectedDigit === key));
    if (game.selectedDigit === key) button.classList.add('selected');

    button.addEventListener('click', () => {
      game.select(key);
      onChange();
    });

    root.append(button);
  }
}
