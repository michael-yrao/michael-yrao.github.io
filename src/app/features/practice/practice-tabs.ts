import { RepoRef } from '../../core/services/github-file.service';
import { clearDraft, draftKey, loadDraft } from './practice-draft';

const TABS_KEY_PREFIX = 'po-practice-tabs:';

/** How many solutions one problem can hold at once. */
export const MAX_SOLUTION_TABS = 5;

/** One problem's solution tabs: each tab's code, and which one is open. */
export interface SolutionTabs {
  readonly texts: readonly string[];
  readonly active: number;
}

/** `po-practice-tabs:<owner>/<repo>:<number>` — same shape as the draft key it replaces. */
export function tabsKey(ref: RepoRef, problemNumber: number): string {
  return `${TABS_KEY_PREFIX}${ref.owner}/${ref.repo}:${problemNumber}`;
}

function clampActive(active: number, count: number): number {
  return Math.min(Math.max(Math.trunc(active), 0), count - 1);
}

function parseTabs(raw: string | null): SolutionTabs | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { texts, active } = parsed as { texts?: unknown; active?: unknown };
    const isValid =
      Array.isArray(texts) &&
      texts.length > 0 &&
      texts.length <= MAX_SOLUTION_TABS &&
      texts.every((text) => typeof text === 'string') &&
      typeof active === 'number' &&
      Number.isFinite(active);
    return isValid ? { texts, active: clampActive(active, texts.length) } : null;
  } catch (err) {
    console.error('Practice tabs: stored value is not valid JSON', err);
    return null;
  }
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.error(`Practice tabs: could not read ${key}`, err);
    return null;
  }
}

/** The saved tabs; else one tab holding the old single draft, else one tab holding the stub. */
export function loadTabs(ref: RepoRef, problemNumber: number, stub: string): SolutionTabs {
  const saved = parseTabs(readKey(tabsKey(ref, problemNumber)));
  if (saved) return saved;
  return { texts: [loadDraft(draftKey(ref, problemNumber)) ?? stub], active: 0 };
}

/** What is stored for a problem: `exists` is false with no draft at all; `savedAt` (ms) is null for a
 *  legacy draft written before records carried a time. */
export interface DraftStamp {
  readonly exists: boolean;
  readonly savedAt: number | null;
}

function savedAtOf(raw: string | null): number | null {
  if (raw === null) return null;
  try {
    const stamp = (JSON.parse(raw) as { savedAt?: unknown } | null)?.savedAt;
    return typeof stamp === 'number' && Number.isFinite(stamp) ? stamp : null;
  } catch {
    return null; // corrupt record: parseTabs already reports it
  }
}

export function loadDraftStamp(ref: RepoRef, problemNumber: number): DraftStamp {
  const raw = readKey(tabsKey(ref, problemNumber));
  if (parseTabs(raw)) return { exists: true, savedAt: savedAtOf(raw) };
  return { exists: loadDraft(draftKey(ref, problemNumber)) !== null, savedAt: null };
}

/** Writes every tab with the time of the write, and drops the old single-draft key so the migration happens once. */
export function saveTabs(ref: RepoRef, problemNumber: number, tabs: SolutionTabs, now: number = Date.now()): void {
  const key = tabsKey(ref, problemNumber);
  try {
    localStorage.setItem(key, JSON.stringify({ ...tabs, savedAt: now }));
  } catch (err) {
    console.error(`Practice tabs: could not save ${key}`, err);
    return;
  }
  clearDraft(draftKey(ref, problemNumber));
}
