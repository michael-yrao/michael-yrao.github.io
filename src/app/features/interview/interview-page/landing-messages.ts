import type { CodeEntry } from '../session/prepared-interviews.service';
import { OFFLINE_MESSAGE, SAVE_REFUSED_MESSAGE } from '../interview-messages';

/** The entries that do not open an interview. */
type EntryFailure = Exclude<CodeEntry['status'], 'interviewer' | 'candidate'>;

/** What the landing says for each code that did not open an interview. */
export const LANDING_MESSAGES: Readonly<Record<EntryFailure, string>> = {
  invalid: 'Enter an 8- or 12-character code.',
  'not-found': 'No interview has this code. If it was just created, try again in a minute.',
  deleted: 'This interview was deleted.',
  unreadable: 'This interview could not be read.',
  offline: OFFLINE_MESSAGE,
  'rate-limited': 'Too many tries. Wait a minute.',
  disabled: 'This code works only in the browser that created it.',
  unsaved: SAVE_REFUSED_MESSAGE,
};
