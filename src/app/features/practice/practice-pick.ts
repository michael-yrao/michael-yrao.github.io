import type { AttemptRecognition } from '../../core/practice/practice-attempt';
import type { RepoRef } from '../../core/services/github-file.service';

const PICK_KEY_PREFIX = 'po-practice-pick:';

/** `po-practice-pick:<owner>/<repo>/<number>` — one pick per problem per repo. */
export function pickKey(ref: RepoRef, problemNumber: number): string {
  return `${PICK_KEY_PREFIX}${ref.owner}/${ref.repo}/${problemNumber}`;
}

function parsePick(raw: string | null, today: string): AttemptRecognition | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { picked, at, day } = parsed as { picked?: unknown; at?: unknown; day?: unknown };
    const isValid = typeof picked === 'string' && picked !== '' && typeof at === 'string' && day === today;
    return isValid ? { picked, at } : null;
  } catch (err) {
    console.error('Practice pick: stored value is not valid JSON', err);
    return null;
  }
}

/** The pick stored for this problem, only when it was made on `today` (a local `YYYY-MM-DD`). */
export function loadPick(ref: RepoRef, problemNumber: number, today: string): AttemptRecognition | null {
  const key = pickKey(ref, problemNumber);
  try {
    return parsePick(localStorage.getItem(key), today);
  } catch (err) {
    console.error(`Practice pick: could not read ${key}`, err);
    return null;
  }
}

export function savePick(ref: RepoRef, problemNumber: number, pick: AttemptRecognition, today: string): void {
  const key = pickKey(ref, problemNumber);
  try {
    localStorage.setItem(key, JSON.stringify({ ...pick, day: today }));
  } catch (err) {
    console.error(`Practice pick: could not save ${key}`, err);
  }
}
