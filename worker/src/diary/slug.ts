export const MAX_SLUG_CHARS = 80;

const ENTRY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMBINING_MARKS = /\p{M}/gu;
const NON_ALPHANUMERIC_RUN = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

/** An entry id is a slug: lowercase ASCII words joined by single dashes, at most MAX_SLUG_CHARS. */
export function isEntryId(id: string): boolean {
  return id.length <= MAX_SLUG_CHARS && ENTRY_ID_PATTERN.test(id);
}

/** The title as a URL slug; the date when the title leaves nothing to slug. */
export function slugify(title: string, date: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUN, '-')
    .replace(EDGE_DASHES, '')
    .slice(0, MAX_SLUG_CHARS)
    .replace(EDGE_DASHES, '');
  return slug === '' ? date : slug;
}
