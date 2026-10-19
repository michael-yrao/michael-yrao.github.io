import { describe, expect, it } from 'vitest';
import { CRED_FILE, REPOS } from './config.js';
import {
  ensureClone,
  syncBeforeTurn,
  writeCredentials,
  type ExecFile,
  type RepoDeps,
  type RepoFs,
} from './repo.js';

const TOKEN = 'tok-test';
const DIR = REPOS.cse.dir;
const HEAD = 'abc1234';

interface Rig {
  readonly deps: RepoDeps;
  readonly argv: string[][];
  readonly writes: Array<{ path: string; data: string; mode: number }>;
  readonly chmods: Array<{ path: string; mode: number }>;
}

function rig(options: { dirty?: boolean; rebaseFails?: boolean; cloned?: boolean } = {}): Rig {
  const argv: string[][] = [];
  const writes: Rig['writes'] = [];
  const chmods: Rig['chmods'] = [];
  const execFile: ExecFile = async (file, args) => {
    argv.push([file, ...args]);
    const sub = args[0];
    if (sub === 'status') return { stdout: options.dirty ? ' M dsa/x.md\n' : '' };
    if (sub === 'rev-parse') return { stdout: `${HEAD}\n` };
    if (sub === 'rebase' && args[1] !== '--abort' && options.rebaseFails) throw new Error('conflict');
    return { stdout: '' };
  };
  const fs: RepoFs = {
    mkdir: async () => undefined,
    writeFile: async (path, data, opts) => void writes.push({ path, data, mode: opts.mode }),
    chmod: async (path, mode) => void chmods.push({ path, mode }),
    exists: async () => options.cloned ?? false,
  };
  const deps: RepoDeps = { execFile, fs, identity: { name: 'Owner', email: 'owner@example.com' } };
  return { deps, argv, writes, chmods };
}

describe('syncBeforeTurn', () => {
  const cases: ReadonlyArray<[string, Parameters<typeof rig>[0], string[][], unknown]> = [
    [
      'clean tree',
      {},
      [['git', 'fetch', 'origin'], ['git', 'status', '--porcelain'], ['git', 'rebase', 'origin/main'], ['git', 'rev-parse', 'origin/main']],
      { kind: 'ok', head: HEAD, dirty: false },
    ],
    [
      'dirty tree skips the rebase',
      { dirty: true },
      [['git', 'fetch', 'origin'], ['git', 'status', '--porcelain'], ['git', 'rev-parse', 'origin/main']],
      { kind: 'ok', head: HEAD, dirty: true },
    ],
    [
      'rebase conflict is aborted',
      { rebaseFails: true },
      [['git', 'fetch', 'origin'], ['git', 'status', '--porcelain'], ['git', 'rebase', 'origin/main'], ['git', 'rebase', '--abort']],
      { kind: 'conflict' },
    ],
  ];

  it.each(cases)('%s', async (_name, options, expectedArgv, expectedResult) => {
    const { deps, argv } = rig(options);
    await expect(syncBeforeTurn(deps, DIR)).resolves.toEqual(expectedResult);
    expect(argv).toEqual(expectedArgv);
  });
});

describe('credentials and clone', () => {
  it('writes the token only to the credential file, mode 0600', async () => {
    const { deps, writes, chmods, argv } = rig();
    await writeCredentials(deps, TOKEN);
    expect(writes).toEqual([{ path: CRED_FILE, data: `https://x-access-token:${TOKEN}@github.com\n`, mode: 0o600 }]);
    expect(chmods).toEqual([{ path: CRED_FILE, mode: 0o600 }]);
    expect(argv).toEqual([]);
  });

  it('rejects a token that is not a plain GitHub token', async () => {
    await expect(writeCredentials(rig().deps, 'bad token@evil')).rejects.toThrow();
  });

  it('clones a missing repo with the token in no argument, and skips an existing clone', async () => {
    const fresh = rig();
    await expect(ensureClone(fresh.deps, REPOS.cse)).resolves.toBe(true);
    expect(fresh.argv[0]).toEqual([
      'git', '-c', `credential.helper=store --file ${CRED_FILE}`, 'clone', '--filter=blob:none',
      'https://github.com/michael-yrao/cse-progress.git', DIR,
    ]);
    expect(fresh.argv.flat().join(' ')).not.toContain(TOKEN);
    expect(fresh.argv.map((args) => args.slice(0, 3).join(' '))).toContain('git config core.hooksPath');

    const existing = rig({ cloned: true });
    await expect(ensureClone(existing.deps, REPOS.cse)).resolves.toBe(false);
    expect(existing.argv).toEqual([]);
  });
});
