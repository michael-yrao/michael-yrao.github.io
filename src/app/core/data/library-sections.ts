// The Library hub's sections, as the hub's subnav rail lists them (the site nav menu links only
// to the hub itself). Kept as one list so any future consumer can't drift from the subnav.

export interface LibrarySection {
  readonly label: string;
  readonly path: string;
}

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  { label: 'Algorithms', path: '/algorithms' },
  { label: 'Patterns', path: '/learn' },
  { label: 'Quiz', path: '/quiz' },
  { label: 'Games', path: '/games' },
];
