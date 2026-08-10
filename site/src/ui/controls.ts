import type { Game } from '../game/state.js';

/** The solved banner, the unlock control, and the new-puzzle control. */
export function renderControls(
  root: HTMLElement,
  game: Game,
  handlers: { onUnlock: () => void; onNewPuzzle: () => void },
): void {
  root.replaceChildren();

  const status = document.createElement('p');
  status.className = 'status';
  status.dataset.testid = 'status';
  if (game.solved) {
    status.textContent = game.locked ? 'Solved' : 'Solved — editing';
    status.classList.add('solved');
  } else {
    status.textContent = '';
  }
  root.append(status);

  if (game.locked) {
    const unlock = document.createElement('button');
    unlock.type = 'button';
    unlock.className = 'control';
    unlock.dataset.testid = 'unlock';
    unlock.textContent = 'Keep editing';
    unlock.addEventListener('click', handlers.onUnlock);
    root.append(unlock);
  }

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'control';
  next.dataset.testid = 'new-puzzle';
  next.textContent = 'New puzzle';
  next.addEventListener('click', handlers.onNewPuzzle);
  root.append(next);
}
