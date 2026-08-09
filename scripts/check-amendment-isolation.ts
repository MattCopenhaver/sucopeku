/**
 * Fails when a pull request changes the constitution alongside anything else.
 *
 * Governance requires an amendment be alone in its pull request, and constitution
 * 3.1.0 makes that a property of the diff rather than of intent: "a branch created
 * from a working tree that already holds unrelated work will carry that work
 * along, and staging everything at once will commit it — without anyone deciding
 * to."
 *
 * That is not hypothetical. Pull request #14 carried an unrelated feature's
 * specification into main by exactly that route, and the stale copy later caused
 * a merge conflict against the version six findings had improved.
 *
 * Compares the pull request's base and head rather than the working tree, so it
 * sees what would actually merge.
 */
import { execFileSync } from 'node:child_process';

const CONSTITUTION = '.specify/memory/constitution.md';

function changedFiles(base: string, head: string): string[] {
  const out = execFileSync('git', ['diff', '--name-only', `${base}`, `${head}`], {
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

function main(): void {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;

  if (!base || !head) {
    console.log('Amendment isolation: no base and head given; nothing to compare.');
    return;
  }

  const files = changedFiles(base, head);
  if (!files.includes(CONSTITUTION)) {
    console.log('Amendment isolation: the constitution is unchanged.');
    return;
  }

  const others = files.filter((f) => f !== CONSTITUTION);
  if (others.length === 0) {
    console.log('Amendment isolation: the constitution changes alone, as Governance requires.');
    return;
  }

  console.error('Amendment isolation: the constitution changes alongside other files.\n');
  for (const f of others) console.error(`  ${f}`);
  console.error(
    '\nGovernance requires an amendment be alone in its pull request, so the rules\n' +
      'are reviewed on their own terms rather than bundled with the change that\n' +
      'prompted them. Move the amendment to its own branch cut from a clean tree,\n' +
      'and open the rest separately.',
  );
  process.exitCode = 1;
}

main();
