/**
 * Verifies that every FR-###, EC-###, and SC-### reference inside a feature's
 * documents resolves to a requirement that feature's spec.md actually defines.
 *
 * Why this exists: inserting a requirement mid-document renumbers everything
 * below it, silently invalidating references in plan.md, tasks.md, research.md,
 * and contracts/. Nothing warns you. It happened in feature 001 and again in
 * feature 002, where eight tasks pointed at unrelated requirements — one task
 * about reading a puzzle id from the address cited the requirement for marking
 * conflicts.
 *
 * A wrong citation is worse than a missing one: it reads as authoritative and
 * sends whoever follows it to the wrong requirement.
 *
 * This checks that references RESOLVE. It cannot check that they are the RIGHT
 * requirement — a citation can point at a real requirement that means something
 * else entirely, which is exactly what happened in feature 002. Only reading
 * catches that.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const SPECS_DIR = 'specs';
const KINDS = ['FR', 'EC', 'SC'] as const;

type Problem = { file: string; ref: string; defined: number };

async function filesUnder(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(full)));
    else if (entry.name.endsWith('.md')) found.push(full);
  }
  return found;
}

/** Definitions look like `**FR-001**:`; references look like `FR-001` anywhere. */
function defined(spec: string, kind: string): Set<string> {
  return new Set(
    [...spec.matchAll(new RegExp(`\\*\\*${kind}-(\\d{3})\\*\\*`, 'g'))].map((m) => m[1]!),
  );
}

function referenced(text: string, kind: string): string[] {
  return [...text.matchAll(new RegExp(`${kind}-(\\d{3})`, 'g'))].map((m) => m[1]!);
}

async function main(): Promise<void> {
  let features = 0;
  const problems: Problem[] = [];

  for (const entry of await readdir(SPECS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(SPECS_DIR, entry.name);
    const specPath = join(dir, 'spec.md');
    try {
      await stat(specPath);
    } catch {
      continue; // a directory without a spec is not a feature
    }
    features += 1;

    const spec = await readFile(specPath, 'utf8');
    const known = Object.fromEntries(KINDS.map((k) => [k, defined(spec, k)]));

    for (const file of await filesUnder(dir)) {
      const text = await readFile(file, 'utf8');
      for (const kind of KINDS) {
        for (const num of referenced(text, kind)) {
          if (!known[kind]!.has(num)) {
            problems.push({ file, ref: `${kind}-${num}`, defined: known[kind]!.size });
          }
        }
      }
    }
  }

  if (problems.length === 0) {
    console.log(`Spec citations: every reference resolves, across ${features} feature(s).`);
    return;
  }

  console.error(`Spec citations: ${problems.length} reference(s) do not resolve.\n`);
  for (const { file, ref, defined: count } of problems) {
    console.error(`  ${file}: ${ref} — the spec defines ${count} of that kind`);
  }
  console.error(
    '\nA reference that does not resolve usually means the spec was renumbered\n' +
      'after this document was written. Re-derive the citation from the current\n' +
      'spec.md rather than shifting numbers by a constant.',
  );
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
