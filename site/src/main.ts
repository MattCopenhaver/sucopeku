import './style.css';
import { puzzleFor, puzzles, rulesetFor, type Puzzle } from './game/data.js';
import { mostRecentUnsolved, onExternalChange, solvedIds } from './game/progress.js';
import { Game, type Mode } from './game/state.js';
import { renderControls } from './ui/controls.js';
import { renderGrid } from './ui/grid.js';
import { chooseMode, renderPad } from './ui/pad.js';
import { followOtherTabs, initTheme } from './ui/theme.js';

const PARAM = 'puzzle';

/**
 * Which puzzle to show when the address names none (FR-003): the most recently
 * played unsolved one, falling back to random when everything with progress is
 * solved or there is nothing yet. The reason to resume at all is to continue
 * work, and a solved puzzle has none left.
 */
function chooseOnArrival(): Puzzle {
  const resumable = mostRecentUnsolved();
  const resumed = puzzleFor(resumable ?? null);
  if (resumed) return resumed;
  return randomPuzzle();
}

/** Prefers puzzles not yet completed while any remain (User Story 4). */
function randomPuzzle(exclude?: string): Puzzle {
  const solved = solvedIds();
  const unplayed = puzzles.filter((p) => !solved.has(p.id) && p.id !== exclude);
  const pool = unplayed.length > 0 ? unplayed : puzzles.filter((p) => p.id !== exclude);
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? puzzles[0];
  if (!chosen) throw new Error('No puzzles are available.');
  return chosen;
}

function addressFor(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, id);
  return `${url.pathname}${url.search}`;
}

// Applied before anything renders, so there is no flash of the wrong theme.
initTheme();

function start(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) return;

  const named = new URL(window.location.href).searchParams.get(PARAM);
  // An unknown or malformed identifier gives a working puzzle, never an error
  // (FR-029, EC-010).
  const puzzle = puzzleFor(named) ?? chooseOnArrival();

  // Replace the address so a reload keeps the player here rather than
  // reshuffling (FR-028).
  if (named !== puzzle.id) {
    window.history.replaceState({}, '', addressFor(puzzle.id));
  }

  const ruleset = rulesetFor(puzzle.ruleset);
  if (!ruleset) {
    app.textContent = 'This puzzle names a ruleset that is not available.';
    return;
  }

  const game = new Game(puzzle, ruleset);
  game.touch();

  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.dataset.testid = 'grid';

  const pad = document.createElement('div');
  pad.className = 'pad';
  pad.dataset.testid = 'pad';

  const controls = document.createElement('div');
  controls.className = 'controls';

  app.replaceChildren(grid, pad, controls);

  const draw = (): void => {
    renderGrid(grid, game);
    renderPad(pad, game, draw);
    renderControls(controls, game, {
      onUnlock: () => {
        game.unlock();
        draw();
      },
      onNewPuzzle: () => {
        const next = randomPuzzle(puzzle.id);
        window.location.href = addressFor(next.id);
      },
    });
  };

  draw();

  // Typing is a shortcut over the same model, not a second one (FR-012).
  window.addEventListener('keydown', (event) => {
    const { width, height } = ruleset.geometry;
    const cell = game.selectedCell;

    // Mode keys switch and place nothing, so there is one way to place a mark
    // rather than two that could drift (003 FR-010, research.md D4).
    const modeKeys: Record<string, Mode> = {
      z: 'value',
      x: 'centre',
      c: 'corner',
      v: 'colour',
    };
    const mode = modeKeys[event.key.toLowerCase()];
    if (mode && !event.ctrlKey && !event.metaKey) {
      // Pressing v again switches palette, exactly as clicking the control does
      // (003 FR-056).
      chooseMode(game, mode);
      draw();
      return;
    }

    if (event.key >= '1' && event.key <= '9') {
      game.place(Number(event.key));
      draw();
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      // Safari still treats Backspace outside a text field as "go back", which
      // would drop the player off the site mid-puzzle. Caught on WebKit; no
      // other browser we test does it.
      event.preventDefault();
      game.place('erase');
      draw();
      return;
    }

    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -width,
      ArrowDown: width,
    };
    const step = moves[event.key];
    if (step !== undefined) {
      event.preventDefault();
      // From where the keyboard is, not from the anchor: the anchor stays put
      // while a range grows, so measuring from it would recompute the same
      // range forever (003 research.md D2).
      const from = game.cursor ?? cell ?? 0;
      const to = from + step;
      // Left and right must not wrap across a row edge.
      const sameRow = Math.floor(from / width) === Math.floor(to / width);
      const vertical = step === width || step === -width;
      if (to >= 0 && to < width * height && (vertical || sameRow)) {
        // Shift extends from the anchor; a bare arrow replaces the selection
        // (003 FR-018).
        if (event.shiftKey) game.extendTo(to);
        else game.selectOnly(to);
        draw();
      }
    }
  });

  // Another tab changed the stored document; show its work (002 FR-036).
  onExternalChange(() => {
    game.reloadFromStorage();
    draw();
  });

  // And a theme change from another tab (003 FR-050).
  followOtherTabs(draw);
}

start();

// Offline support, from feature 001. Registering with a URL resolved against the
// document's base is what makes the worker's scope follow the deployment prefix
// — hardcoding '/sw.js' would break every preview.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('sw.js', document.baseURI);
    navigator.serviceWorker.register(workerUrl).catch((error: unknown) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
