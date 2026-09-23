// The Library hub's sections — shared between the subnav (the hub's own desktop rail) and the
// site nav drawer's Library group, so the two link lists can't drift out of sync.
//
// These three counts are literals, not `ALL_ALGORITHMS.length` etc., on purpose: this file is
// imported by the root AppComponent (for the nav drawer), so importing the data modules here
// would pull the whole algorithm corpus — all 96 .steps files, plus the cheat-sheet code
// strings — into the INITIAL bundle instead of a lazy chunk. `library-sections.spec.ts` guards
// each one against drift by asserting it against the real data module's own count.
export const ALGORITHM_WALKTHROUGH_COUNT = 96;
export const CHEAT_SHEET_COUNT = 10;
export const PLAYABLE_GAME_COUNT = 4;

export interface LibrarySection {
  readonly label: string;
  readonly path: string;
  readonly glyph: string;
  readonly hint: string;
}

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  {
    label: 'Algorithms',
    path: '/algorithms',
    glyph: '◈',
    hint: `${ALGORITHM_WALKTHROUGH_COUNT} walkthroughs`,
  },
  {
    label: 'Patterns',
    path: '/learn',
    glyph: '▤',
    hint: `${CHEAT_SHEET_COUNT} cheat sheets`,
  },
  {
    label: 'Games',
    path: '/games',
    glyph: '◉',
    hint: `${PLAYABLE_GAME_COUNT} playable`,
  },
];
