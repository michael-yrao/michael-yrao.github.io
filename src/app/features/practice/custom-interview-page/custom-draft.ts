import { STATEMENT_MAX_LENGTH, TITLE_MAX_LENGTH } from '../interview/session-message';

/** What the setup form holds before a session starts, saved as it is typed. */
export interface CustomDraft {
  readonly title: string;
  readonly statement: string;
  readonly starter: string;
}

export const EMPTY_DRAFT: CustomDraft = { title: '', statement: '', starter: '' };

const DRAFT_KEY = 'po-custom-draft';

/** A stored draft, or null when it is not three strings. Title and statement are cut to their wire limits. */
export function parseDraft(value: unknown): CustomDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const { title, statement, starter } = value as Record<string, unknown>;
  if (typeof title !== 'string' || typeof statement !== 'string' || typeof starter !== 'string') return null;
  return { title: title.slice(0, TITLE_MAX_LENGTH), statement: statement.slice(0, STATEMENT_MAX_LENGTH), starter };
}

/** The saved draft; storage is external input, so bad JSON or a wrong shape is logged and read as empty. */
export function loadDraft(): CustomDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw === null) return EMPTY_DRAFT;
    const draft = parseDraft(JSON.parse(raw));
    if (draft) return draft;
    console.error(`Custom problem: ${DRAFT_KEY} has the wrong shape`);
  } catch (err) {
    console.error(`Custom problem: could not read ${DRAFT_KEY}`, err);
  }
  return EMPTY_DRAFT;
}

export function saveDraft(draft: CustomDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error(`Custom problem: could not save ${DRAFT_KEY}`, err);
  }
}
