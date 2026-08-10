/**
 * Stored progress: one versioned document, all puzzles (contracts/storage.md C2).
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
const VERSION = 1;
const MAX_PUZZLES = 10;

export interface PuzzleProgress {
  entries: Record<string, number>;
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
