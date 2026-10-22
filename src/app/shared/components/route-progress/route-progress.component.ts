import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter, map, of, switchMap, timer } from 'rxjs';

/** A navigation faster than this never shows the bar, so quick route changes do not flash it. */
export const ROUTE_PROGRESS_DELAY_MS = 150;

/** A thin accent bar under the nav while a route (lazy chunk, guards, resolvers) is loading. */
@Component({
  selector: 'app-route-progress',
  templateUrl: './route-progress.component.html',
  styleUrls: ['./route-progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteProgressComponent {
  private readonly router = inject(Router);

  readonly isShown = toSignal(
    this.router.events.pipe(
      map((e) =>
        e instanceof NavigationStart
          ? true
          : e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError
            ? false
            : null,
      ),
      filter((isStart): isStart is boolean => isStart !== null),
      switchMap((isStart) => (isStart ? timer(ROUTE_PROGRESS_DELAY_MS).pipe(map(() => true)) : of(false))),
    ),
    { initialValue: false },
  );
}
