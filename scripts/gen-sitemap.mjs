// Generates src/sitemap.xml: the static pages plus /practice/<n> and /practice/<n>/solution per problem.
// Default: write the file. `--check`: write nothing, exit 1 when the committed file is stale.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAlgorithmEntries } from './gen-registry.mjs';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUTPUT_FILE = join(REPO_ROOT, 'src/sitemap.xml');
const ORIGIN = 'https://progressiveoverflow.com';
const CHECK_FLAG = '--check';
const STATIC_PATHS = [
  '/',
  '/library',
  '/coach',
  '/about',
  '/games',
  '/quiz',
  '/learn',
  '/events',
  '/interview',
  '/practice',
];

function problemPaths(entries) {
  return [...entries]
    .sort((a, b) => a.lcNumber - b.lcNumber)
    .flatMap((e) => [`/practice/${e.lcNumber}`, `/practice/${e.lcNumber}/solution`]);
}

function render(paths) {
  const urls = paths.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

function summarize(entries, total) {
  const stubs = entries.filter((e) => !e.hasVisualization).length;
  return `${total} urls: ${STATIC_PATHS.length} static, ${entries.length} practice, ${entries.length} solution (${stubs} problems without visualization)`;
}

function main() {
  const entries = readAlgorithmEntries();
  const paths = [...STATIC_PATHS, ...problemPaths(entries)];
  const output = render(paths);
  const summary = summarize(entries, paths.length);
  if (!process.argv.includes(CHECK_FLAG)) {
    writeFileSync(OUTPUT_FILE, output, 'utf8');
    console.log(`gen-sitemap: wrote ${OUTPUT_FILE} (${summary})`);
    return;
  }
  const current = existsSync(OUTPUT_FILE) ? normalizeEol(readFileSync(OUTPUT_FILE, 'utf8')) : null;
  if (current === output) {
    console.log(`gen-sitemap: up to date (${summary})`);
    return;
  }
  console.error('gen-sitemap: sitemap.xml is stale — run `npm run gen:sitemap`.');
  process.exitCode = 1;
}

try {
  main();
} catch (err) {
  console.error(`gen-sitemap: ${err.message}`);
  process.exitCode = 1;
}
