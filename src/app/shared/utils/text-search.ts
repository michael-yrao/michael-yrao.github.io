/** Lower-cased, trimmed, with a leading `#` dropped; '' when the query is blank. */
export function normaliseQuery(query: string): string {
  const trimmed = query.trim();
  return (trimmed.startsWith('#') ? trimmed.slice(1) : trimmed).toLowerCase();
}

/** Number prefix (`'1'` hits 1, 10, 100…) or case-insensitive title substring; '' matches everything. */
export function matchesNumberOrTitle(number: number, title: string, needle: string): boolean {
  if (needle === '') return true;
  return String(number).startsWith(needle) || title.toLowerCase().includes(needle);
}

/** Case-insensitive substring over several text fields; '' matches everything. */
export function matchesAnyText(fields: readonly string[], needle: string): boolean {
  if (needle === '') return true;
  return fields.some((field) => field.toLowerCase().includes(needle));
}
