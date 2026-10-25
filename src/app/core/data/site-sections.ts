// The footer's link columns. The first imports the rail's list, so the footer and the
// Practice subnav cannot drift.
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
    heading: 'Site',
    links: [
      { label: 'Coach', path: SITE_LINKS.coach },
      { label: 'About', path: '/about' },
      { label: 'GitHub', href: SITE_LINKS.siteRepo },
    ],
  },
];
