import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_NAME = 'Progressive Overflow';
const TITLE_SEPARATOR = ' · ';
const DESCRIPTION_SELECTOR = 'name="description"';

/** One sentence per top-level section, keyed by the first URL segment. A section without an entry keeps the index.html description. */
export const PAGE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '':
    'Spaced-repetition interview prep: practice problems with step-by-step visualizations, pattern cheat sheets, drills, and a review board that brings each problem back on the day you would forget it.',
  about: 'Who builds Progressive Overflow, and why.',
  start: 'Pick a study track and get a practice repo on your GitHub account.',
  coach:
    'See how the spaced-repetition coach schedules reviews and keeps each problem honest, all from a conversation in Claude Code.',
  games: 'Play interactive games that build intuition for the algorithm each one uses.',
  quiz: 'Take quick-fire drills that test naming the pattern and the complexity before writing any code.',
  'cheat-sheet':
    'Read one cheat sheet per technique: when to use it, the canonical template, and the pitfalls.',
  interview:
    'Run a practice problem as a live interview with a partner, then keep the debrief.',
  practice:
    'Browse the LeetCode and NeetCode problems, filter by difficulty, and open a walkthrough or a runnable practice page.',
};

/** The first path segment of a router URL, query and fragment stripped: '/practice/1?x=2' gives 'practice', '/' gives ''. */
/** The section key of a top-level page ('' for the landing page); null for a nested page, whose
 *  section sentence would describe the list rather than the page, so the site default is used. */
function sectionKey(url: string): string | null {
  const path = url.split(/[?#]/, 1)[0];
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  return segments.length <= 1 ? (segments[0] ?? '') : null;
}

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly defaultDescription =
    this.meta.getTag(DESCRIPTION_SELECTOR)?.content ?? '';

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.title.setTitle(routeTitle ? `${routeTitle}${TITLE_SEPARATOR}${SITE_NAME}` : SITE_NAME);
    const key = sectionKey(snapshot.url);
    this.setDescription((key !== null && PAGE_DESCRIPTIONS[key]) || this.defaultDescription);
  }

  private setDescription(content: string): void {
    this.meta.updateTag({ name: 'description', content }, DESCRIPTION_SELECTOR);
  }
}
