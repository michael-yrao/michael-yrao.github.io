/** A number as at least two digits, zero-padded: 7 → '07'. */
export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
