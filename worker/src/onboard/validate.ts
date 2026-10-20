import { isRecord } from '../github/write-file';

export const LEARNER_REPO = 'cse-progress';
export const MARKER_PATHS = [
  'dashboard/manifest.json',
  'cse.config.example.yml',
  'cse.config.yml',
] as const;

function fullName(repo: unknown): string | null {
  if (!isRecord(repo)) return null;
  const name = repo['full_name'];
  return typeof name === 'string' ? name : null;
}

/** True when the repo was generated from the given template (`owner/name`). */
export function isCoachRepo(repo: unknown, templateFullName: string): boolean {
  if (!isRecord(repo)) return false;
  const template = repo['template_repository'];
  if (!isRecord(template)) return false;
  const name = template['full_name'];
  return typeof name === 'string' && name.toLowerCase() === templateFullName.toLowerCase();
}

/** False for a renamed or transferred repo, where GitHub redirects to a different `full_name`. */
export function isExpectedName(repo: unknown, login: string): boolean {
  const name = fullName(repo);
  return name !== null && name.toLowerCase() === `${login}/${LEARNER_REPO}`.toLowerCase();
}
