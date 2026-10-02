import { RepoRef } from '../../core/services/github-file.service';

const DRAFT_KEY_PREFIX = 'po-practice-draft:';

/** `po-practice-draft:<owner>/<repo>:<number>` — branch is deliberately not part of the key. */
export function draftKey(ref: RepoRef, problemNumber: number): string {
  return `${DRAFT_KEY_PREFIX}${ref.owner}/${ref.repo}:${problemNumber}`;
}

/** The saved draft, or null when there is none or storage is unavailable. */
export function loadDraft(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.error(`Practice draft: could not read ${key}`, err);
    return null;
  }
}

export function saveDraft(key: string, text: string): void {
  try {
    localStorage.setItem(key, text);
  } catch (err) {
    console.error(`Practice draft: could not save ${key}`, err);
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Practice draft: could not clear ${key}`, err);
  }
}
