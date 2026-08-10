/**
 * Stored progress: one versioned document, all puzzles (contracts/storage.md C2).
 *
 * Version 2 adds annotations. A version 1 document is discarded rather than
 * upgraded (003 FR-037, EC-005) — constitution 3.0.0 permits that before
 * Sucopeku 1.0 provided the failure is graceful, and the discard path below
 * already existed for unrecognised versions, so this is a changed constant
 * rather than a new behaviour.
 *
 * Two behaviours are worth knowing about before reading:
 *
 *   Saving merges into the document as it currently stands rather than writing
 *   back what was last read, so a tab cannot erase a puzzle it never touched
 *   (FR-037).
 *
 *   An unrecognised version discards the whole document. Before Sucopeku 1.0
 *   formats may break provided failure is graceful (constitution 3.0.0), so
 *   discarding is the specified behaviour rather than a shortcut — there is no
 *   migration code until 1.0 makes it necessary.
 */

const KEY = 'sucopeku.progress';
const VERSION = 2;
const MAX_PUZZLES = 10;

/** Payloads keyed by cell index, keyed by annotation kind (003 data-model.md). */
export type StoredAnnotations = Record<string, Record<string, unknown>>;

export interface PuzzleProgress {
  entries: Record<string, number>;
  /**
   * Keyed by kind so a kind this release does not have can be ignored without
   * disturbing the ones it does — the same tolerance the ruleset loader applies
   * to an unknown primitive (003 FR-007).
   */
  annotations: StoredAnnotations;
  solved: boolean;
  unlocked: boolean;
  playedAt: number;
}

interface Document {
  v: number;
  puzzles: Record<string, PuzzleProgress>;
}

const empty = (): Document => ({ v: VERSION, puzzles: {} });

/** Storage may be denied or full; play must continue regardless (EC-006). */
function read(): Document {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Document;
    if (parsed?.v !== VERSION || typeof parsed.puzzles !== 'object') return empty();
    return parsed;
  } catch {
    return empty();
  }
}

function write(document: Document): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(document));
  } catch {
    // Out of quota, or storage denied. The game keeps working; progress does
    // not survive. Failing to start would be the worse outcome (EC-006).
  }
}

/** Beyond ten puzzles, the least recently played is dropped (FR-034). */
function evict(document: Document): void {
  const ids = Object.keys(document.puzzles);
  if (ids.length <= MAX_PUZZLES) return;
  ids
    .sort((a, b) => (document.puzzles[a]?.playedAt ?? 0) - (document.puzzles[b]?.playedAt ?? 0))
    .slice(0, ids.length - MAX_PUZZLES)
    .forEach((id) => delete document.puzzles[id]);
}

export function load(puzzleId: string): PuzzleProgress | undefined {
  return read().puzzles[puzzleId];
}

export function save(puzzleId: string, progress: PuzzleProgress): void {
  const document = read(); // re-read: merge into what is there now, not what we last saw
  document.puzzles[puzzleId] = progress;
  evict(document);
  write(document);
}

/** The most recently played puzzle that is not solved (FR-003). */
export function mostRecentUnsolved(): string | undefined {
  const { puzzles } = read();
  return Object.entries(puzzles)
    .filter(([, progress]) => !progress.solved)
    .sort(([, a], [, b]) => b.playedAt - a.playedAt)
    .map(([id]) => id)[0];
}

export function solvedIds(): ReadonlySet<string> {
  const { puzzles } = read();
  return new Set(
    Object.entries(puzzles)
      .filter(([, progress]) => progress.solved)
      .map(([id]) => id),
  );
}

/**
 * Notifies when another tab changes the stored document (FR-036).
 *
 * The browser fires `storage` in every tab except the one that wrote, which is
 * exactly the signal needed and why no polling is involved.
 */
export function onExternalChange(listener: () => void): void {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) listener();
  });
}

/**
 * The theme preference, deliberately not in the document above (003 FR-048).
 *
 * Progress is versioned, is discarded when the version moves — which this very
 * release does — and evicts puzzles beyond ten. A preference must survive all
 * three, so it lives under its own key.
 *
 * There are three states and only two are stored: *follow the device* is the
 * absence of the key, not a stored "auto". That way a player who never chose
 * and a player who changed their mind back reach identical storage, rather than
 * two states that have to be kept behaving alike.
 */
const THEME_KEY = 'sucopeku.theme';

export type ThemeChoice = 'light' | 'dark' | null;

export function loadTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    // Anything unrecognised falls back to following the device (003 EC-011).
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

export function saveTheme(choice: ThemeChoice): void {
  try {
    if (choice === null) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage refused. The theme still applies for this session.
  }
}

/** Fires when another tab changes the theme (003 FR-050). */
export function onThemeChange(listener: () => void): void {
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY || event.key === null) listener();
  });
}
