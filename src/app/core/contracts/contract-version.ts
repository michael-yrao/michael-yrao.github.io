import { isRecord } from './is-record';

/** Null when the payload carries exactly the schema version this viewer speaks;
 *  otherwise the message that tells the person which side to update. */
export function contractVersionProblem(
  payload: unknown,
  expected: number,
  label: string,
): string | null {
  const found = isRecord(payload) ? payload['schemaVersion'] : undefined;
  if (typeof found !== 'number') {
    return `That repo's ${label} data has no schema version; this viewer speaks v${expected}. Regenerate it with a current cse-coach.`;
  }
  if (found === expected) return null;
  const prefix = `That repo's ${label} data is schema v${found}; this viewer speaks v${expected}.`;
  return found > expected
    ? `${prefix} Update the site.`
    : `${prefix} Regenerate it with a current cse-coach.`;
}
