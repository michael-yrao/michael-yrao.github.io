import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { CoachAvailabilityService } from './core/coach/coach-availability.service';
import { CoachUiService } from './core/coach/coach-ui.service';
import { isCoachOwner } from './core/data/site-links';
import { FOOTER_COLUMNS } from './core/data/site-sections';
import { TodaySessionService } from './core/today-session/today-session.service';
import { CoachPanelComponent } from './features/coach-panel/coach-panel.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { LogoMarkComponent } from './shared/components/logo-mark/logo-mark.component';
import { MenuComponent } from './shared/components/menu/menu.component';
import { RouteProgressComponent } from './shared/components/route-progress/route-progress.component';

/** The coach docks beside the page (instead of overlaying it) from this viewport width up. */
export const COACH_DOCK_MIN_PX = 1024;
const COACH_DOCK_QUERY = `(min-width: ${COACH_DOCK_MIN_PX}px)`;
const PRACTICE_PROBLEM_URL = /^\/practice\/\d+/;

interface NavLink {
  readonly label: string;
  readonly path: string;
  /** First path segments that light this link; matched whole, so `/practices` lights nothing. */
  readonly segments: ReadonlySet<string>;
}

const NAV_LINKS: readonly NavLink[] = [
  { label: 'Practice', path: '/practice', segments: new Set(['practice', 'quiz', 'cheat-sheet']) },
  { label: 'Interview', path: '/interview', segments: new Set(['interview']) },
  { label: 'Games', path: '/games', segments: new Set(['games']) },
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // CoachPanelComponent is used only inside `@defer`, so its chunk (marked, DOMPurify, highlight.js) loads on first open.
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoMarkComponent, MenuComponent, CoachPanelComponent, IconComponent, RouteProgressComponent],
})
export class AppComponent {
  readonly footerColumns = FOOTER_COLUMNS;
  readonly navLinks = NAV_LINKS;
  readonly year = new Date().getFullYear();

  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly coachUi = inject(CoachUiService);
  protected readonly todaySession = inject(TodaySessionService);
  private readonly coachAvailability = inject(CoachAvailabilityService);
  /** The owner, on a deploy whose Worker serves a coach; everyone else never sees the toggle or the panel. */
  readonly hasCoach = computed(() => isCoachOwner(this.auth.login()) && this.coachAvailability.available());

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  private readonly isWide = signal(false);
  /** Open on a practice problem with room to spare: the page shrinks and the coach sits beside it. */
  readonly isCoachDocked = computed(
    () => this.hasCoach() && this.coachUi.isOpen() && this.isWide() && PRACTICE_PROBLEM_URL.test(this.url()),
  );

  constructor() {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(COACH_DOCK_QUERY);
    this.isWide.set(query.matches);
    query.addEventListener('change', (e) => this.isWide.set(e.matches));
  }

  /** The path of the bar link the current page belongs to, or null; matched on the whole first path segment. */
  private readonly activePath = computed(() => {
    const [segment] = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
    return NAV_LINKS.find((link) => link.segments.has(segment ?? ''))?.path ?? null;
  });

  isNavLinkActive(link: NavLink): boolean {
    return this.activePath() === link.path;
  }

  signIn(): void {
    this.auth.signIn(this.router.url);
  }

  signOut(): void {
    this.auth.signOut();
  }
}
