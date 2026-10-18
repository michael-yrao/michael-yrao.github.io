// The 'expansion' key mirrors EXPANSION_FAMILY in technique-map-layout.ts (importing it here
// would make the two files circular).
const FAMILY_LABEL: ReadonlyMap<string, string> = new Map([
  ['arrays_and_hash', 'Arrays & Hashing'],
  ['two_pointers', 'Two Pointers'],
  ['sliding_window', 'Sliding Window'],
  ['prefix_sum', 'Prefix Sum'],
  ['binary_search', 'Binary Search'],
  ['stack', 'Stack'],
  ['linked_list', 'Linked List'],
  ['recursion', 'Recursion'],
  ['sorting', 'Sorting'],
  ['intervals', 'Intervals'],
  ['backtracking', 'Backtracking'],
  ['trees', 'Trees'],
  ['tries', 'Tries'],
  ['heap', 'Heap'],
  ['graphs', 'Graphs'],
  ['advanced_graphs', 'Advanced Graphs'],
  ['dynamic_programming', 'Dynamic Programming'],
  ['greedy', 'Greedy'],
  ['bit_manipulation', 'Bit Manipulation'],
  ['design', 'Design'],
  ['math_sim', 'Math & Simulation'],
  ['strings', 'Strings'],
  ['expansion', 'Expansion (tier 1–3)'],
]);

/** A family's display label — the curated name when known, else the raw family string
 *  (never blank), so an unrecognized family still reads as something in the lane column. */
export function labelFor(family: string): string {
  return FAMILY_LABEL.get(family) ?? family;
}
