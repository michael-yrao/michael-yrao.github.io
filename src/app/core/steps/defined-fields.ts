/** Drops every key whose value is `undefined`, so an optional field the caller
 *  did not pass is absent from the built state rather than present-but-empty. */
export function definedFields<T extends object>(fields: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
