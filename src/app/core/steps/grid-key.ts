/** The `"row,col"` key a walkthrough uses to track visited grid cells in a Set. */
export function gridKey(row: number, col: number): string {
  return `${row},${col}`;
}
