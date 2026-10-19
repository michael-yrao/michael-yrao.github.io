import { dirname, join } from 'node:path';
import {
  CRED_FILE,
  CRED_FILE_MODE,
  GITHUB_HOST,
  GIT_BRANCH,
  REMOTE_NAME,
  WORK_DIR,
  type RepoSpec,
} from './config.js';

// Every git call goes through an injected `execFile` (argv only, never a shell). The GitHub token is
// written to the 0600 credential file and nowhere else: it is never an argument or an env value.

export type ExecFile = (
  file: string,
  args: readonly string[],
  options: { readonly cwd?: string },
) => Promise<{ readonly stdout: string }>;

export interface RepoFs {
  mkdir(path: string, options: { readonly recursive: true }): Promise<unknown>;
  writeFile(path: string, data: string, options: { readonly mode: number }): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export interface GitIdentity {
  readonly name: string;
  readonly email: string;
}

export interface RepoDeps {
  readonly execFile: ExecFile;
  readonly fs: RepoFs;
  readonly identity: GitIdentity;
}

export type SyncResult =
  | { readonly kind: 'ok'; readonly head: string; readonly dirty: boolean }
  | { readonly kind: 'conflict' };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
const CREDENTIAL_HELPER = `store --file ${CRED_FILE}`;
const REMOTE_BRANCH = `${REMOTE_NAME}/${GIT_BRANCH}`;

function git(deps: RepoDeps, cwd: string, args: readonly string[]): Promise<{ readonly stdout: string }> {
  return deps.execFile('git', args, { cwd });
}

/** Writes the owner's GitHub token for git's credential store: mode 0600, in that one file only. */
export async function writeCredentials(deps: RepoDeps, token: string): Promise<void> {
  if (!TOKEN_PATTERN.test(token)) throw new Error('GitHub token has an unexpected shape');
  await deps.fs.mkdir(dirname(CRED_FILE), { recursive: true });
  await deps.fs.writeFile(CRED_FILE, `https://x-access-token:${token}@${GITHUB_HOST}\n`, {
    mode: CRED_FILE_MODE,
  });
  await deps.fs.chmod(CRED_FILE, CRED_FILE_MODE); // writeFile's mode only applies when it creates the file
}

async function configureClone(deps: RepoDeps, repo: RepoSpec): Promise<void> {
  const settings: ReadonlyArray<readonly [string, string]> = [
    ['credential.helper', CREDENTIAL_HELPER],
    ['core.hooksPath', '.githooks'],
    ['user.name', deps.identity.name],
    ['user.email', deps.identity.email],
  ];
  for (const [key, value] of settings) {
    await git(deps, repo.dir, ['config', key, value]);
  }
  await git(deps, repo.dir, ['config', '--global', '--add', 'safe.directory', repo.dir]);
}

/** Clones `repo` (blob-less) when it is absent; true when it cloned. */
export async function ensureClone(deps: RepoDeps, repo: RepoSpec): Promise<boolean> {
  if (await deps.fs.exists(join(repo.dir, '.git'))) return false;
  await deps.fs.mkdir(WORK_DIR, { recursive: true });
  await deps.execFile(
    'git',
    [
      '-c',
      `credential.helper=${CREDENTIAL_HELPER}`,
      'clone',
      '--filter=blob:none',
      `https://${GITHUB_HOST}/${repo.slug}.git`,
      repo.dir,
    ],
    {},
  );
  await configureClone(deps, repo);
  return true;
}

export async function remoteHead(deps: RepoDeps, dir: string): Promise<string> {
  return (await git(deps, dir, ['rev-parse', REMOTE_BRANCH])).stdout.trim();
}

export async function isDirty(deps: RepoDeps, dir: string): Promise<boolean> {
  return (await git(deps, dir, ['status', '--porcelain'])).stdout.trim() !== '';
}

/**
 * Fetches, then rebases onto origin/main only when the tree is clean. A dirty tree is left alone.
 * A failed rebase is aborted and reported as a conflict; a failed fetch throws.
 */
export async function syncBeforeTurn(deps: RepoDeps, dir: string): Promise<SyncResult> {
  await git(deps, dir, ['fetch', REMOTE_NAME]);
  const dirty = await isDirty(deps, dir);
  if (dirty) return { kind: 'ok', head: await remoteHead(deps, dir), dirty };

  try {
    await git(deps, dir, ['rebase', REMOTE_BRANCH]);
  } catch {
    // The abort itself may fail when git never started the rebase; the conflict result stands either way.
    await git(deps, dir, ['rebase', '--abort']).catch(() => undefined);
    return { kind: 'conflict' };
  }
  return { kind: 'ok', head: await remoteHead(deps, dir), dirty };
}
