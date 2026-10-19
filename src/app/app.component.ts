import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { CoachUiService } from './core/coach/coach-ui.service';
import { SITE_LINKS, isCoachOwner } from './core/data/site-links';
import { CoachPanelComponent } from './features/coach-panel/coach-panel.component';
import { LogoMarkComponent } from './shared/components/logo-mark/logo-mark.component';

/** The coach docks beside the page (instead of overlaying it) from this viewport width up. */
export const COACH_DOCK_MIN_PX = 1024;
const COACH_DOCK_QUERY = `(min-width: ${COACH_DOCK_MIN_PX}px)`;
const PRACTICE_PROBLEM_URL = /^\/practice\/\d+/;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // CoachPanelComponent is used only inside `@defer`, so its chunk (marked, DOMPurify, highlight.js) loads on first open.
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoMarkComponent, CoachPanelComponent],
})
export class AppComponent {
  readonly SITE_LINKS = SITE_LINKS;
  readonly year = new Date().getFullYear();

  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly coachUi = inject(CoachUiService);
  readonly isCoachOwner = computed(() => isCoachOwner(this.auth.login()));

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
    () => this.coachUi.isOpen() && this.isWide() && PRACTICE_PROBLEM_URL.test(this.url()),
  );

  constructor() {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(COACH_DOCK_QUERY);
    this.isWide.set(query.matches);
    query.addEventListener('change', (e) => this.isWide.set(e.matches));
  }
  /** The Progress link is for signed-in viewers; with the app off the site shows it as before. */
  readonly hasProgressLink = computed(() => !this.auth.isEnabled || this.auth.isSignedIn());

  signIn(): void {
    this.auth.signIn(this.router.url);
  }

  signOut(): void {
    this.auth.signOut();
  }

  readonly isDrawerOpen = signal(false);

  toggleDrawer(event: MouseEvent): void {
    event.stopPropagation();
    this.isDrawerOpen.update((open) => !open);
  }

  closeAll(): void {
    this.isDrawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }
}
