// The Library hub's sections — shared between the subnav (the hub's own desktop rail) and the
// site nav drawer's Library group, so the two link lists can't drift out of sync.
export const LIBRARY_SECTIONS: readonly { label: string; path: string }[] = [
  { label: 'Algorithms', path: '/algorithms' },
  { label: 'Patterns', path: '/learn' },
  { label: 'Games', path: '/games' },
];
