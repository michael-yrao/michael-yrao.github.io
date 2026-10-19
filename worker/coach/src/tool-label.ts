import { posix } from 'node:path';

const SCRIPT_PATTERN = /(?:^|[\s/])([\w.-]+\.py)\b/;
const PYTEST_PATTERN = /\bpytest\b/;
const COMMIT_PATTERN = /\bgit\s+commit\b/;
const PUSH_PATTERN = /\bgit\s+push\b/;

function field(input: unknown, key: string): string {
  if (typeof input !== 'object' || input === null) return '';
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function baseName(path: string): string {
  return posix.basename(path.replace(/\\/g, '/'));
}

function withTarget(verb: string, target: string): string {
  return target === '' ? verb : `${verb} ${target}`;
}

function bashLabel(command: string): string {
  if (COMMIT_PATTERN.test(command)) return 'Committed';
  if (PUSH_PATTERN.test(command)) return 'Pushed';
  const script = SCRIPT_PATTERN.exec(command);
  if (script?.[1] !== undefined) return `Ran ${script[1]}`;
  if (PYTEST_PATTERN.test(command)) return 'Ran tests';
  return 'Ran a command';
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'a page';
  }
}

/** A short human label for a tool call: what the learner sees in a tool row. */
export function toolLabel(name: string, input: unknown): string {
  switch (name) {
    case 'Bash':
      return bashLabel(field(input, 'command'));
    case 'Edit':
    case 'MultiEdit':
      return withTarget('Edited', baseName(field(input, 'file_path')));
    case 'Write':
      return withTarget('Wrote', baseName(field(input, 'file_path')));
    case 'Read':
      return withTarget('Read', baseName(field(input, 'file_path')));
    case 'Glob':
    case 'Grep':
      return 'Searched';
    case 'Skill':
      return withTarget('Skill', field(input, 'skill'));
    case 'WebFetch':
      return hostname(field(input, 'url'));
    default:
      return name;
  }
}
