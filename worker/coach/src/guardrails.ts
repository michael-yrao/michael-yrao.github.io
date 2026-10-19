import { posix } from 'node:path';
import type { SyncHookJSONOutput } from '@anthropic-ai/claude-agent-sdk';
import { CRED_FILE } from './config.js';

// Study-only guard. Pure functions plus the SDK hook callback body: nothing is read or parsed per call
// except the command or path being judged; every table below is a constant built once at load.

export interface RepoRoots {
  readonly cse: string;
  readonly sd: string;
}

export interface GuardInput {
  readonly tool_name: string;
  readonly tool_input: unknown;
}

export type Verdict = { readonly allow: true } | { readonly allow: false; readonly reason: string };

const ALLOW: Verdict = { allow: true };

interface WriteScope {
  readonly prefixes: readonly string[];
  readonly files: readonly string[];
}

// Where Edit and Write may land, relative to each clone's root.
const CSE_WRITE_SCOPE: WriteScope = {
  prefixes: ['docs/foundations/', 'dsa/'],
  files: [
    'holds.yml',
    'decisions.yml',
    'dashboard/pattern_sense.yml',
    'dashboard/showcase.yml',
    'dashboard/bigo.yml',
    '.claude/memory/self_eval_log.md',
  ],
};
const SD_WRITE_SCOPE: WriteScope = { prefixes: ['mocks/'], files: [] };

const WRITE_TOOLS: ReadonlySet<string> = new Set(['Edit', 'Write', 'MultiEdit']);
const BASH_TOOL = 'Bash';
const NULL_DEVICE = '/dev/null';

function relativeWithin(root: string, absolutePath: string): string | null {
  const rel = posix.relative(root, absolutePath);
  if (rel === '' || rel === '..' || rel.startsWith('../') || posix.isAbsolute(rel)) return null;
  return rel;
}

function inScope(rel: string, scope: WriteScope): boolean {
  return scope.files.includes(rel) || scope.prefixes.some((prefix) => rel.startsWith(prefix));
}

/** True when `path` (absolute, or relative to the cse-progress clone) is a study file the coach may write. */
export function isAllowedWrite(path: string, roots: RepoRoots): boolean {
  const resolved = posix.resolve(roots.cse, path);
  const inCse = relativeWithin(roots.cse, resolved);
  if (inCse !== null) return inScope(inCse, CSE_WRITE_SCOPE);
  const inSd = relativeWithin(roots.sd, resolved);
  return inSd !== null && inScope(inSd, SD_WRITE_SCOPE);
}

interface DenyRule {
  readonly pattern: RegExp;
  readonly reason: string;
}

const INLINE_SCRIPT_REASON = 'Denied: inline scripts are not allowed here.';

// Each pattern is tested against one command segment with its leading wrappers removed.
const BASH_DENYLIST: readonly DenyRule[] = [
  { pattern: /^git\s+push\b.*(\s-[a-z]*f[a-z]*(\s|$)|--force|\s\+\S)/, reason: 'Denied: force-push is not allowed here.' },
  { pattern: /^git\s+reset\b.*--hard/, reason: 'Denied: git reset --hard is not allowed here.' },
  { pattern: /^git\s+checkout\s+(--\s+)?\.(\s|$)/, reason: 'Denied: discarding the working tree is not allowed here.' },
  { pattern: /^git\s+branch\b.*\s-D\b/, reason: 'Denied: deleting branches is not allowed here.' },
  { pattern: /^git\s+clean\b/, reason: 'Denied: git clean is not allowed here.' },
  { pattern: /^git\s+config\b/, reason: 'Denied: changing git config is not allowed here.' },
  { pattern: /^rm\s+(\S+\s+)*(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)(\s|$)/, reason: 'Denied: recursive delete is not allowed here.' },
  { pattern: /^(pip3?|npm|npx|apt|apt-get|curl|wget)(\s|$)/, reason: 'Denied: installs and network tools are not allowed here.' },
  { pattern: /^python3?\s+-m\s+pip\b/, reason: 'Denied: installs are not allowed here.' },
  { pattern: /^chmod\b/, reason: 'Denied: chmod is not allowed here.' },
  { pattern: /^(bash|sh)\s+-c(\s|$)/, reason: INLINE_SCRIPT_REASON },
  { pattern: /^eval(\s|$)/, reason: INLINE_SCRIPT_REASON },
  { pattern: /^python3?\s+-c(\s|$)/, reason: INLINE_SCRIPT_REASON },
  { pattern: /^(node|perl)\s+-e(\s|$)/, reason: INLINE_SCRIPT_REASON },
  { pattern: /^find\s(.*\s)?-delete(\s|$)/, reason: 'Denied: find -delete is not allowed here.' },
];

const CREDENTIAL_REASON = 'Denied: the credential file is not readable here.';
// Built once at load; CRED_FILE already contains the bare name, both are listed so a change to either still holds.
const CREDENTIAL_NEEDLES: readonly string[] = ['.git-credentials', CRED_FILE];
const CREDENTIAL_READ_TOOLS: ReadonlySet<string> = new Set(['Read', 'Glob', 'Grep']);
const CREDENTIAL_READ_FIELDS: readonly string[] = ['file_path', 'path', 'pattern'];

function mentionsCredentials(text: string): boolean {
  return CREDENTIAL_NEEDLES.some((needle) => text.includes(needle));
}

const SEGMENT_SPLIT = /&&|\|\||[;|\n`)]|\$\(/;
const LEADING_WRAPPERS = /^(?:(?:\w+=\S*|sudo|env|time|nohup|xargs|command|nice)\s+)+/;
const REDIRECT_TARGET = /\d*>>?\s*(?!&)([^\s<>|;&]+)/g;
const SED_IN_PLACE = /^-[a-zA-Z]*i|^--in-place/;

function stripQuotes(token: string): string {
  return token.replace(/^['"]|['"]$/g, '');
}

function commandSegments(command: string): string[] {
  return command
    .split(SEGMENT_SPLIT)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');
}

function writeDenial(target: string, roots: RepoRoots): Verdict {
  if (target === NULL_DEVICE || isAllowedWrite(target, roots)) return ALLOW;
  return { allow: false, reason: `Denied: ${target} is not a study file this coach may write.` };
}

function firstDenied(targets: readonly string[], roots: RepoRoots): Verdict {
  for (const target of targets) {
    const verdict = writeDenial(stripQuotes(target), roots);
    if (!verdict.allow) return verdict;
  }
  return ALLOW;
}

function redirectTargets(segment: string): string[] {
  return Array.from(segment.matchAll(REDIRECT_TARGET), (match) => match[1] ?? '');
}

function fileOperands(tokens: readonly string[]): string[] {
  return tokens.filter((token) => !token.startsWith('-') && !token.startsWith('>'));
}

/** The files a `sed -i`, `tee`, `rm`, `cp`, `mv` or `git mv` segment writes, or none when the segment is none of those. */
function commandWriteTargets(tokens: readonly string[]): string[] {
  const [command, ...args] = tokens;
  if (command === 'tee' || command === 'rm') return fileOperands(args);
  if (command === 'cp' || command === 'mv') return fileOperands(args).slice(-1);
  if (command === 'git' && args[0] === 'mv') return fileOperands(args.slice(1));
  if (command !== 'sed' || !args.some((arg) => SED_IN_PLACE.test(arg))) return [];
  const [, ...files] = fileOperands(args); // the first operand is the sed script
  return files;
}

function segmentVerdict(rawSegment: string, roots: RepoRoots): Verdict {
  if (mentionsCredentials(rawSegment)) return { allow: false, reason: CREDENTIAL_REASON };
  const segment = rawSegment.replace(LEADING_WRAPPERS, '');
  const rule = BASH_DENYLIST.find((candidate) => candidate.pattern.test(segment));
  if (rule !== undefined) return { allow: false, reason: rule.reason };

  const tokens = segment.split(/\s+/);
  return firstDenied([...commandWriteTargets(tokens), ...redirectTargets(rawSegment)], roots);
}

/** Judges a Bash command: denied when any chained part is denied. */
export function bashVerdict(command: string, roots: RepoRoots): Verdict {
  for (const segment of commandSegments(command)) {
    const verdict = segmentVerdict(segment, roots);
    if (!verdict.allow) return verdict;
  }
  return ALLOW;
}

function fieldString(input: unknown, key: string): string | null {
  if (typeof input !== 'object' || input === null) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

function toolVerdict(toolName: string, toolInput: unknown, roots: RepoRoots): Verdict {
  if (WRITE_TOOLS.has(toolName)) {
    const path = fieldString(toolInput, 'file_path');
    if (path === null) return { allow: false, reason: 'Denied: the edit names no file.' };
    return writeDenial(path, roots);
  }
  if (toolName === BASH_TOOL) {
    const command = fieldString(toolInput, 'command');
    if (command === null) return { allow: false, reason: 'Denied: the command is empty.' };
    return bashVerdict(command, roots);
  }
  if (CREDENTIAL_READ_TOOLS.has(toolName)) {
    const mentions = CREDENTIAL_READ_FIELDS.some((key) => {
      const value = fieldString(toolInput, key);
      return value !== null && mentionsCredentials(value);
    });
    if (mentions) return { allow: false, reason: CREDENTIAL_REASON };
  }
  return ALLOW;
}

/** The SDK PreToolUse hook body: `{}` lets the call through, a deny carries the one-line reason. */
export function preToolUseGuard(input: GuardInput, roots: RepoRoots): SyncHookJSONOutput {
  const verdict = toolVerdict(input.tool_name, input.tool_input, roots);
  if (verdict.allow) return {};
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: verdict.reason,
    },
  };
}
