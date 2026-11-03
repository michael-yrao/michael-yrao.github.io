// Fetches the content repo's dashboard files, deriving the repo from CONTENT_REPO_SLUG, and exports
// <NAME>_JSON=<absolute path> for each (appended to $GITHUB_ENV when set, else printed).
// Usage: node scripts/fetch-content.mjs [outDir]   (outDir defaults to $RUNNER_TEMP/content)
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const SITE_LINKS_PATH = new URL('../src/app/core/data/site-links.ts', import.meta.url);
const SLUG_PATTERN = /export const CONTENT_REPO_SLUG\s*=\s*'([^']+)'/;
const CONTENT_BRANCH = 'main';
const CONTENT_FILES = [
  'dashboard/showcase.json',
  'dashboard/practice.json',
  'dashboard/cheat-sheets.json',
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readSlug() {
  const match = SLUG_PATTERN.exec(readFileSync(SITE_LINKS_PATH, 'utf8'));
  if (!match) {
    fail(`CONTENT_REPO_SLUG not found in ${SITE_LINKS_PATH.pathname}`);
  }
  return match[1];
}

function resolveOutDir() {
  const dir = process.argv[2] ?? (process.env.RUNNER_TEMP ? join(process.env.RUNNER_TEMP, 'content') : undefined);
  if (!dir) {
    fail('No out dir: pass one as the first argument or set RUNNER_TEMP');
  }
  return resolve(dir);
}

function envName(file) {
  return `${basename(file, '.json').toUpperCase().replace(/-/g, '_')}_JSON`;
}

async function fetchFile(slug, file, outDir) {
  const url = `https://raw.githubusercontent.com/${slug}/${CONTENT_BRANCH}/${file}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(`Fetch failed for ${url}: ${error.message}`);
  }
  if (!response.ok) {
    fail(`HTTP ${response.status} for ${url}`);
  }
  const target = join(outDir, basename(file));
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return `${envName(file)}=${target}`;
}

const slug = readSlug();
const outDir = resolveOutDir();
mkdirSync(outDir, { recursive: true });
const lines = [];
for (const file of CONTENT_FILES) {
  lines.push(await fetchFile(slug, file, outDir));
}
const output = `${lines.join('\n')}\n`;
if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, output);
} else {
  process.stdout.write(output);
}
