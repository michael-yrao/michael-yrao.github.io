// Constants for the coach runtime. Tuned values live here and nowhere else.

export const PORT = 8080;
export const HOME_DIR = '/home/coach';
export const WORK_DIR = `${HOME_DIR}/work`;
export const CRED_FILE = `${HOME_DIR}/.git-credentials`;
export const CLAUDE_CONFIG_DIR = `${HOME_DIR}/.claude-config`;

export const GITHUB_HOST = 'github.com';
export const GIT_BRANCH = 'main';
export const REMOTE_NAME = 'origin';
export const CRED_FILE_MODE = 0o600;

export interface RepoSpec {
  readonly slug: string;
  readonly dir: string;
}

export const REPOS = {
  cse: { slug: 'michael-yrao/cse-progress', dir: `${WORK_DIR}/cse-progress` },
  sd: { slug: 'michael-yrao/sd-progress', dir: `${WORK_DIR}/sd-progress` },
} as const satisfies Record<string, RepoSpec>;

export const MODEL = 'claude-opus-5-5';
export const EFFORT = 'high';
// One streaming-input query() spans the whole study session, so this caps the session; the API key's spend limit is the real cap.
export const MAX_TURNS = 500;

export const DEFAULT_TZ = 'America/New_York';
export const ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep', 'Skill'] as const;

export const MAX_BODY_BYTES = 256 * 1024;
export const GIT_TIMEOUT_MS = 120_000;
export const GIT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
