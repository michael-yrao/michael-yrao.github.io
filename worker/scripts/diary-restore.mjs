// Decrypts a diary.enc backup (see src/diary/backup.ts).
//
//   DIARY_BACKUP_KEY=<base64> node scripts/diary-restore.mjs <diary.enc> --list
//   DIARY_BACKUP_KEY=<base64> node scripts/diary-restore.mjs <diary.enc> --out <file>
//   DIARY_BACKUP_KEY=<base64> node scripts/diary-restore.mjs <diary.enc> --put
//
// --list prints each entry's date and title only. --out writes the decrypted entries JSON.
// --put writes them back to Workers KV (binding INTERVIEWS, remote) through a temp bulk file.
// The key comes from the environment so it stays out of shell history.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY_ENV = 'DIARY_BACKUP_KEY';
const KEY_BYTES = 32;
const ENTRY_PREFIX = 'diary:entry:';
const KV_BINDING = 'INTERVIEWS';
const BULK_FILE_NAME = 'diary-bulk.json';
const USAGE = `usage: ${KEY_ENV}=<base64 key> node diary-restore.mjs <diary.enc> (--list | --out <file> | --put)`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function fromBase64(text) {
  return Uint8Array.from(Buffer.from(text, 'base64'));
}

async function decryptEntries(filePath, keyBase64) {
  const file = JSON.parse(readFileSync(filePath, 'utf8'));
  if (file.v !== 1 || file.alg !== 'AES-256-GCM') fail('unsupported backup format');
  const keyBytes = fromBase64(keyBase64);
  if (keyBytes.length !== KEY_BYTES) fail(`${KEY_ENV} must decode to ${KEY_BYTES} bytes`);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, key, fromBase64(file.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return fail('decryption failed: wrong key or a damaged file');
  }
}

function listEntries(entries) {
  entries.forEach((entry) => console.log(`${entry.date}  ${entry.title}`));
}

function putEntries(entries) {
  const bulk = entries.map((entry) => ({ key: `${ENTRY_PREFIX}${entry.id}`, value: JSON.stringify(entry) }));
  const dir = mkdtempSync(join(tmpdir(), 'diary-restore-'));
  const bulkPath = join(dir, BULK_FILE_NAME);
  try {
    writeFileSync(bulkPath, JSON.stringify(bulk));
    const run = spawnSync('npx', ['wrangler', 'kv', 'bulk', 'put', bulkPath, '--binding', KV_BINDING, '--remote'], {
      stdio: 'inherit',
      shell: true,
    });
    if (run.status !== 0) fail('wrangler kv bulk put failed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const [filePath, mode, outPath] = process.argv.slice(2);
  const keyBase64 = process.env[KEY_ENV];
  if (!filePath || !keyBase64) fail(USAGE);
  if (mode !== '--list' && mode !== '--put' && !(mode === '--out' && outPath)) fail(USAGE);

  const entries = await decryptEntries(filePath, keyBase64);
  if (mode === '--list') listEntries(entries);
  else if (mode === '--out') writeFileSync(outPath, JSON.stringify(entries, null, 2));
  else putEntries(entries);
}

await main();
