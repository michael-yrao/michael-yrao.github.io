// Fails when a worker contract file and its Angular-side mirror drift apart (headers aside).
import { readFileSync } from 'node:fs';

const REPO_ROOT = new URL('../', import.meta.url);
// The headers are a run of `//` lines (events pair) or a `/** */` block (interview pair).
const LEADING_BLOCK_COMMENT = /^(?:\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*))+\s*/;

const PAIRS = [
  ['worker/src/contract.ts', 'src/app/core/models/events.model.ts'],
  ['worker/src/interviews/contract.ts', 'src/app/features/interview/directory/directory-contract.ts'],
];

function readBody(relativePath) {
  const text = readFileSync(new URL(relativePath, REPO_ROOT), 'utf8');
  return text.replace(/\r\n/g, '\n').replace(LEADING_BLOCK_COMMENT, '');
}

function lineDiff(workerLines, mirrorLines) {
  const length = Math.max(workerLines.length, mirrorLines.length);
  const out = [];
  for (let i = 0; i < length; i++) {
    if (workerLines[i] === mirrorLines[i]) {
      continue;
    }
    if (workerLines[i] !== undefined) out.push(`-${workerLines[i]}`);
    if (mirrorLines[i] !== undefined) out.push(`+${mirrorLines[i]}`);
  }
  return out;
}

let hasDrift = false;
for (const [workerPath, mirrorPath] of PAIRS) {
  const workerBody = readBody(workerPath);
  const mirrorBody = readBody(mirrorPath);
  if (workerBody === mirrorBody) {
    continue;
  }
  hasDrift = true;
  console.error(`--- ${workerPath}\n+++ ${mirrorPath}`);
  console.error(lineDiff(workerBody.split('\n'), mirrorBody.split('\n')).join('\n'));
}
process.exit(hasDrift ? 1 : 0);
