// The Practice hub's sections, as the sub-navigation row lists them. Shares the Library row's shape
// so the same sub-navigation component renders either list.

import type { LibrarySection } from './library-sections';

export const PRACTICE_SECTIONS: readonly LibrarySection[] = [
  { label: 'Problems', path: '/practice' },
  { label: 'Interview', path: '/interview' },
];
