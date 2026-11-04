/** A bound as shown to the viewer: the label, with its qualifier appended when there is one.
 *  `null` when the label is null or absent. */
export function complexityLabel(
  label: string | null | undefined,
  qualifier: string | null | undefined,
): string | null {
  if (!label) return null;
  return qualifier ? `${label} ${qualifier}` : label;
}
