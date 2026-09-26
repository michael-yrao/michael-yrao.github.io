import {
  Component,
  ChangeDetectionStrategy,
  InjectionToken,
  computed,
  inject,
  signal,
} from '@angular/core';

import { EventSource, TechEvent } from '../../../core/models/events.model';
import { EventsService } from '../../../core/services/events.service';
import { LoadStatus } from '../../../core/services/github-file.service';
import { EVENTS_FEED_ENABLED } from '../../../core/data/site-links';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import {
  DEFAULT_EVENTS_FILTER,
  EventAreaFilter,
  EventDayGroup,
  chipSources,
  filterEvents,
  formatAsOf,
  formatDayLabel,
  formatEventTime,
  groupByDay,
} from '../events-view';

const BREADCRUMB: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Events' }];

/** The live feed is off (worker not deployed yet); the page shows a "coming soon" card and
 *  never fetches. Flip `EVENTS_FEED_ENABLED` in `site-links.ts` to turn it on. */
export const EVENTS_FEED_ENABLED_TOKEN = new InjectionToken<boolean>(
  'EVENTS_FEED_ENABLED_TOKEN',
  { providedIn: 'root', factory: () => EVENTS_FEED_ENABLED },
);

@Component({
  selector: 'app-events-page',
  templateUrl: './events-page.component.html',
  styleUrls: ['./events-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, LibrarySubnavComponent],
})
export class EventsPageComponent {
  private readonly events = inject(EventsService);

  readonly breadcrumb = BREADCRUMB;
  readonly feedEnabled = inject(EVENTS_FEED_ENABLED_TOKEN);

  readonly area = signal<EventAreaFilter>(DEFAULT_EVENTS_FILTER.area);
  readonly sourceId = signal<string | null>(DEFAULT_EVENTS_FILTER.sourceId);
  readonly query = signal(DEFAULT_EVENTS_FILTER.query);

  readonly error = this.events.error;
  readonly generatedAt = this.events.generatedAt;
  readonly failedSources = this.events.failedSources;

  /** True while a load (forced or not) is in flight — drives the Refresh button's disabled
   *  state. Kept separate from `status` below, which favours showing existing data over a
   *  spinner once anything has loaded. */
  readonly loading = computed<boolean>(() => this.events.status() === 'loading');

  /** The state the page switches its main content on. Once any feed has loaded, a forced
   *  refresh (whether it's still in flight or it failed) never replaces the cards on screen
   *  with a spinner or an error panel — only an empty `data` falls through to the raw service
   *  status. A failed refresh is instead surfaced by `refreshFailed` below, as a non-blocking
   *  notice alongside the still-visible cards. */
  readonly status = computed<LoadStatus>(() =>
    this.events.data() !== null ? 'ready' : this.events.status(),
  );

  /** True when a refresh failed but the page is still showing the last successful load's
   *  cards (rather than the blocking error panel `status`'s 'error' case renders). Drives a
   *  small `role="alert"` notice in the 'ready' branch so a failed refresh is never silent. */
  readonly refreshFailed = computed<boolean>(
    () => this.events.data() !== null && this.events.status() === 'error',
  );

  readonly sourcesById = computed<Readonly<Record<string, EventSource>>>(() =>
    Object.fromEntries((this.events.data()?.sources ?? []).map((source) => [source.id, source])),
  );

  readonly sourceChips = computed<readonly EventSource[]>(() => chipSources(this.events.data()));

  /** Whether the feed has any upcoming event at all, ignoring the area/source/query filters —
   *  distinguishes "no events" (nothing scheduled) from "no matches" (the filters are just
   *  too narrow) in the empty state. */
  readonly anyUpcoming = computed<boolean>(
    () =>
      filterEvents(
        this.events.data()?.events ?? [],
        DEFAULT_EVENTS_FILTER,
        Date.now(),
        this.sourcesById(),
      ).length > 0,
  );

  readonly visible = computed<readonly TechEvent[]>(() =>
    filterEvents(
      this.events.data()?.events ?? [],
      { area: this.area(), sourceId: this.sourceId(), query: this.query() },
      Date.now(),
      this.sourcesById(),
    ),
  );

  readonly groups = computed<readonly EventDayGroup[]>(() => groupByDay(this.visible()));

  constructor() {
    if (this.feedEnabled) this.load();
  }

  load(force = false): void {
    this.events.load(force);
  }

  refresh(): void {
    this.load(true);
  }

  setArea(area: EventAreaFilter): void {
    this.area.set(area);
  }

  /** Clicking the already-selected source chip clears the source filter back to "every
   *  source" — the same toggle-off behaviour a single-select chip row needs. */
  setSource(id: string): void {
    this.sourceId.set(this.sourceId() === id ? null : id);
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  sourceLabel(sourceId: string): string {
    return this.sourcesById()[sourceId]?.label ?? sourceId;
  }

  sourceCompany(sourceId: string): string {
    return this.sourcesById()[sourceId]?.company ?? '';
  }

  failedSourceLabels(): string {
    return this.failedSources()
      .map((source) => source.label)
      .join(', ');
  }

  formatTime(event: TechEvent): string {
    return formatEventTime(event);
  }

  formatDay(dayKey: string): string {
    return formatDayLabel(dayKey);
  }

  asOf(): string | null {
    const generatedAt = this.generatedAt();
    return generatedAt ? formatAsOf(generatedAt) : null;
  }
}
