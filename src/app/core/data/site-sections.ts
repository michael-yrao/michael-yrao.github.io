// The footer's link columns. The first imports the Practice subnav's list, so the footer and the
// subnav cannot drift; the second holds the Interview and Games bar links.
import { LibrarySection } from './library-sections';
import { PRACTICE_SECTIONS } from './practice-sections';
import { SITE_LINKS } from './site-links';

export interface ExternalLink {
  readonly label: string;
  readonly href: string;
}

export type FooterLink = LibrarySection | ExternalLink;

export interface FooterColumn {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  { heading: 'Practice', links: PRACTICE_SECTIONS },
  {
    heading: 'Play',
    links: [
      { label: 'Interview', path: '/interview' },
      { label: 'Games', path: '/games' },
    ],
  },
  {
    heading: 'Site',
    links: [
      { label: 'Coach', path: SITE_LINKS.coach },
      { label: 'About', path: '/about' },
    ],
  },
];
