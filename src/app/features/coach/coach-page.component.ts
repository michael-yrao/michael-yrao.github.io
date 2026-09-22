import { Component, ChangeDetectionStrategy, InjectionToken, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, BreadcrumbEntry } from '../../shared/components/page-header/page-header.component';
import { SITE_LINKS, COACH_REPO_IS_PUBLIC } from '../../core/data/site-links';

/**
 * DI seam for the repo-public flag. COACH_REPO_IS_PUBLIC in site-links.ts stays
 * the single source of truth (the factory default below just reads it) — this
 * token exists only so a spec can flip the flag via TestBed.overrideProvider.
 * A vi.mock on the site-links import cannot do this: the unit-test builder
 * pre-bundles the app through esbuild before Vitest runs, so the module
 * boundary vi.mock needs to intercept no longer exists at test time.
 */
export const COACH_REPO_PUBLIC = new InjectionToken<boolean>('COACH_REPO_PUBLIC', {
  providedIn: 'root',
  factory: () => COACH_REPO_IS_PUBLIC,
});

interface CoachMove {
  youSay: string;
  coachDoes: string;
}

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Coach' },
];

const COACH_MOVES: CoachMove[] = [
  {
    youSay: '"Starting <problem>"',
    coachDoes: 'Sets up a dated solution file with the problem statement and a link already filled in — you write every line.',
  },
  {
    youSay: 'you ask a clarifying question',
    coachDoes: "Answers freely, but won't hand you the approach unless you're truly stuck.",
  },
  {
    youSay: '"Clean / Shaky / Blank"',
    coachDoes: 'Grades the attempt honestly, logs it, and schedules the next review — proactively.',
  },
];

@Component({
  selector: 'app-coach-page',
  templateUrl: './coach-page.component.html',
  styleUrls: ['./coach-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class CoachPageComponent {
  readonly SITE_LINKS = SITE_LINKS;
  readonly breadcrumb = BREADCRUMB;
  readonly moves = COACH_MOVES;
  readonly isRepoPublic = inject(COACH_REPO_PUBLIC);
}
