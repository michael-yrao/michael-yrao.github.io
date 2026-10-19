import { execFile } from 'node:child_process';
import { access, chmod, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { CLAUDE_CONFIG_DIR, GIT_MAX_BUFFER_BYTES, GIT_TIMEOUT_MS, PORT, REPOS } from './config.js';
import {
  ensureClone,
  isDirty,
  remoteHead,
  syncBeforeTurn,
  writeCredentials,
  type ExecFile,
  type RepoDeps,
  type RepoFs,
} from './repo.js';
import { createCoachServer } from './server.js';
import { createSession } from './session.js';
import type { TurnDeps, TurnRepo } from './turn.js';

// Production wiring: real child processes, real files, the real SDK. Everything with logic is
// injected into the modules this file connects, and those are what the specs cover.

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const TRANSCRIPT_EXTENSION = '.jsonl';

const run = promisify(execFile);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set`);
  return value;
}

const runGit: ExecFile = async (file, args, options) => {
  const { stdout } = await run(file, [...args], {
    cwd: options.cwd,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
  });
  return { stdout };
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const repoFs: RepoFs = {
  mkdir: (path, options) => mkdir(path, options),
  writeFile: (path, data, options) => writeFile(path, data, options),
  chmod,
  exists: pathExists,
};

const repoDeps: RepoDeps = {
  execFile: runGit,
  fs: repoFs,
  identity: { name: requiredEnv('COACH_GIT_NAME'), email: requiredEnv('COACH_GIT_EMAIL') },
};

/** True when a saved transcript for `sessionId` exists under the config dir. */
async function transcriptExists(sessionId: string): Promise<boolean> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return false;
  const projectsDir = join(CLAUDE_CONFIG_DIR, 'projects');
  const projects = await readdir(projectsDir).catch(() => [] as string[]);
  const checks = projects.map((project) => pathExists(join(projectsDir, project, `${sessionId}${TRANSCRIPT_EXTENSION}`)));
  return (await Promise.all(checks)).some(Boolean);
}

let warming: Promise<void> | null = null;
let hasStartedSdClone = false;

/** Waits for an in-flight warm-up so a message never races it on the same clone. */
async function afterWarmUp(): Promise<void> {
  await warming?.catch(() => undefined);
}

function startSdClone(): void {
  if (hasStartedSdClone) return;
  hasStartedSdClone = true;
  ensureClone(repoDeps, REPOS.sd).catch((error: unknown) => {
    console.error('sd-progress clone failed', error instanceof Error ? error.message : 'unknown error');
  });
}

const session = createSession();

const turnRepo: TurnRepo = {
  writeCredentials: (token) => writeCredentials(repoDeps, token),
  ensureClone: async (repo) => {
    await afterWarmUp();
    return ensureClone(repoDeps, repo);
  },
  sync: async (dir) => {
    await afterWarmUp();
    return syncBeforeTurn(repoDeps, dir);
  },
  remoteHead: (dir) => remoteHead(repoDeps, dir),
  isDirty: (dir) => isDirty(repoDeps, dir),
  startSdClone,
  hasSdClone: () => pathExists(join(REPOS.sd.dir, '.git')),
};

const turnDeps: TurnDeps = { query, repo: turnRepo, session, transcriptExists, processEnv: process.env };

async function warmUp(token: string): Promise<void> {
  await writeCredentials(repoDeps, token);
  if (await ensureClone(repoDeps, REPOS.cse)) startSdClone();
  const synced = await syncBeforeTurn(repoDeps, REPOS.cse.dir);
  if (synced.kind === 'ok') session.setRepoState(synced.head, synced.dirty);
}

function warm(token: string): Promise<void> {
  warming ??= warmUp(token).finally(() => {
    warming = null;
  });
  return warming;
}

createCoachServer({ session, turnDeps, warm }).listen(PORT, () => {
  console.log(`coach runtime listening on ${PORT}`);
});
