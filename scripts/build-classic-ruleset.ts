/**
 * Emits the classic Sudoku ruleset as data.
 *
 * Development only. Nothing at runtime imports this — the site reads the
 * committed JSON it produces (research.md D2). If this file were loaded at
 * startup, the knowledge of rows, columns, and boxes that FR-006 removes from
 * the evaluator would simply have moved one layer up.
 *
 * It exists so that 243 cell indices can be produced without transcription
 * errors, not because generating a ruleset is part of how the site works. A
 * future variant could be hand-written, or produced by an authoring interface,
 * and would be no less legitimate.
 *
 *   npx tsx scripts/build-classic-ruleset.ts > site/src/rulesets/classic-9x9.json
 */

const SIZE = 9;
const BOX = 3;

type Constraint = { primitive: string; cells: number[] };

const index = (row: number, column: number): number => row * SIZE + column;

function allDifferentSets(): Constraint[] {
  const constraints: Constraint[] = [];

  for (let row = 0; row < SIZE; row += 1) {
    constraints.push({
      primitive: 'all-different',
      cells: Array.from({ length: SIZE }, (_, column) => index(row, column)),
    });
  }

  for (let column = 0; column < SIZE; column += 1) {
    constraints.push({
      primitive: 'all-different',
      cells: Array.from({ length: SIZE }, (_, row) => index(row, column)),
    });
  }

  for (let boxRow = 0; boxRow < SIZE; boxRow += BOX) {
    for (let boxColumn = 0; boxColumn < SIZE; boxColumn += BOX) {
      const cells: number[] = [];
      for (let row = boxRow; row < boxRow + BOX; row += 1) {
        for (let column = boxColumn; column < boxColumn + BOX; column += 1) {
          cells.push(index(row, column));
        }
      }
      constraints.push({ primitive: 'all-different', cells });
    }
  }

  return constraints;
}

const ruleset = {
  id: 'classic-9x9',
  name: 'Classic Sudoku',
  geometry: { width: SIZE, height: SIZE },
  values: Array.from({ length: SIZE }, (_, i) => i + 1),
  constraints: allDifferentSets(),
};

console.log(JSON.stringify(ruleset, null, 2));
