import { InterviewNotes, parseNotes } from './debrief';

export const NOTES_KEY_PREFIX = 'po-interview-notes:';

function keyFor(sessionId: string): string {
  return `${NOTES_KEY_PREFIX}${sessionId}`;
}

/** The interviewer's in-progress notes; bad JSON or a wrong shape is logged by key and kind only, and read as nothing. */
export function loadNotes(sessionId: string): InterviewNotes | null {
  const key = keyFor(sessionId);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const notes = parseNotes(JSON.parse(raw));
    if (notes === null) {
      console.error(`Interview notes: ${key} has the wrong shape`);
    }
    return notes;
  } catch {
    console.error(`Interview notes: could not read ${key}`);
    return null;
  }
}

export function saveNotes(sessionId: string, notes: InterviewNotes): void {
  const key = keyFor(sessionId);
  try {
    localStorage.setItem(key, JSON.stringify(notes));
  } catch {
    console.error(`Interview notes: could not save ${key}`);
  }
}

export function clearNotes(sessionId: string): void {
  const key = keyFor(sessionId);
  try {
    localStorage.removeItem(key);
  } catch {
    console.error(`Interview notes: could not clear ${key}`);
  }
}
