import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { EventsPageComponent, EVENTS_FEED_ENABLED_TOKEN } from './events-page.component';
import { EventsFeed, EVENTS_SCHEMA_VERSION } from '../../../core/models/events.model';
import { EVENTS_API_URL } from '../../../core/data/site-links';

function futureIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function pastIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function makeFeed(overrides: Partial<EventsFeed> = {}): EventsFeed {
  return {
    schemaVersion: EVENTS_SCHEMA_VERSION,
    generatedAt: '2026-09-26T12:00:00Z',
    horizonDays: 30,
    sources: [
      { id: 's1', label: 'NYC Tech', company: 'Meetup', kind: 'ical', ok: true, count: 1 },
      { id: 's2', label: 'React Online', company: 'Bevy', kind: 'bevy', ok: true, count: 1 },
    ],
    events: [
      {
        id: 'e1',
        title: 'Two Sum Night',
        start: futureIso(24),
        area: 'nyc',
        location: 'Brooklyn, NY',
        url: 'https://example.com/e1',
        sourceId: 's1',
      },
      {
        id: 'e2',
        title: 'React Online Hours',
        start: futureIso(48),
        area: 'online',
        url: 'https://example.com/e2',
        sourceId: 's2',
      },
      {
        id: 'e3',
        title: 'Last Week Meetup',
        start: pastIso(24),
        area: 'nyc',
        url: 'https://example.com/e3',
        sourceId: 's1',
      },
    ],
    ...overrides,
  };
}

function makeHttp(get: (url: string) => unknown) {
  const calls: string[] = [];
  return {
    calls,
    get: (url: string) => {
      calls.push(url);
      return get(url);
    },
  };
}

function createFixture(http: { get: (url: string) => unknown }, feedEnabled = true) {
  TestBed.configureTestingModule({
    imports: [EventsPageComponent],
    providers: [
      provideRouter([]),
      { provide: HttpClient, useValue: http },
      { provide: EVENTS_FEED_ENABLED_TOKEN, useValue: feedEnabled },
    ],
  });
  const fixture = TestBed.createComponent(EventsPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('EventsPageComponent', () => {
  it('renders one card per upcoming event and hides past ones', () => {
    const fixture = createFixture(makeHttp(() => of(makeFeed())));

    const cards = fixture.nativeElement.querySelectorAll('.event-card');

    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('Last Week Meetup');
  });

  it('the NYC area chip hides online events', () => {
    const fixture = createFixture(makeHttp(() => of(makeFeed())));
    const component = fixture.componentInstance;

    component.setArea('nyc');
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.event-card__title')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(titles).toEqual(['Two Sum Night']);
  });

  it("'All' never shows an 'other'-area event", () => {
    const feed = makeFeed({
      events: [
        ...makeFeed().events,
        {
          id: 'e4',
          title: 'Mystery Area Event',
          start: futureIso(10),
          area: 'other',
          url: 'https://example.com/e4',
          sourceId: 's1',
        },
      ],
    });
    const fixture = createFixture(makeHttp(() => of(feed)));

    expect(fixture.nativeElement.textContent).not.toContain('Mystery Area Event');
  });

  it('search narrows the visible cards by title', () => {
    const fixture = createFixture(makeHttp(() => of(makeFeed())));
    const component = fixture.componentInstance;

    component.setQuery('React');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.event-card');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('React Online Hours');
  });

  it("search narrows by the event's source company, even when the title lacks the word", () => {
    const fixture = createFixture(makeHttp(() => of(makeFeed())));
    const component = fixture.componentInstance;

    // 'Two Sum Night' (source s1, company 'Meetup') mentions neither company; only the
    // 'React Online Hours' event (source s2, company 'Bevy') should match a 'Bevy' search.
    component.setQuery('Bevy');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.event-card');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('React Online Hours');
  });

  it('shows the error state with a Retry button on a load failure', () => {
    const fixture = createFixture(makeHttp(() => throwError(() => ({ status: 500 }))));

    const errorState = fixture.nativeElement.querySelector('.events-state--error');
    const retry = fixture.nativeElement.querySelector('.events-state--error button');

    expect(errorState).toBeTruthy();
    expect(retry?.textContent).toContain('Retry');
  });

  it('shows a loading state while the request is pending', () => {
    const fixture = createFixture(makeHttp(() => new Observable(() => {})));

    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status).toBeTruthy();
  });

  it("shows the feed's generatedAt in the 'as of' line", () => {
    const feed = makeFeed({ generatedAt: '2026-09-26T12:00:00Z' });
    const fixture = createFixture(makeHttp(() => of(feed)));

    const time = fixture.nativeElement.querySelector('.events-toolbar__asof time');

    expect(time.getAttribute('datetime')).toBe('2026-09-26T12:00:00Z');
  });

  it('Refresh triggers a second GET and keeps the cards on screen while it is pending', () => {
    let call = 0;
    const http = makeHttp(() => {
      call += 1;
      return call === 1 ? of(makeFeed()) : new Observable(() => {});
    });
    const fixture = createFixture(http);

    const refreshBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.events-toolbar .events-btn--primary',
    );
    refreshBtn.click();
    fixture.detectChanges();

    expect(http.calls.length).toBe(2);
    expect(http.calls[1]).toContain(`${EVENTS_API_URL}?_=`);
    expect(fixture.nativeElement.querySelectorAll('.event-card').length).toBe(2);
    expect(refreshBtn.disabled).toBe(true);
  });

  it('a failed Refresh keeps the cards on screen AND shows a non-blocking notice', () => {
    let call = 0;
    const http = makeHttp(() => {
      call += 1;
      return call === 1 ? of(makeFeed()) : throwError(() => ({ status: 500 }));
    });
    const fixture = createFixture(http);

    const refreshBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.events-toolbar .events-btn--primary',
    );
    refreshBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.event-card').length).toBe(2);
    const notice = fixture.nativeElement.querySelector('[role="alert"]');
    expect(notice).toBeTruthy();
    expect(notice.textContent).toContain('Could not load the events feed (HTTP 500).');
  });

  it("an online-area event shows the Online badge even when it carries a location", () => {
    const feed = makeFeed({
      events: [
        {
          id: 'e5',
          title: 'Virtual Chapter Night',
          start: futureIso(12),
          area: 'online',
          location: 'NYC Chapter',
          url: 'https://example.com/e5',
          sourceId: 's2',
        },
      ],
    });
    const fixture = createFixture(makeHttp(() => of(feed)));

    const badge = fixture.nativeElement.querySelector('.event-card__badge');
    const location = fixture.nativeElement.querySelector('.event-card__location');

    expect(badge?.textContent).toContain('Online');
    expect(location).toBeFalsy();
  });

  it('shows the coming-soon card and never calls the events API when the feed flag is false', () => {
    const http = makeHttp(() => of(makeFeed()));
    const fixture = createFixture(http, false);

    const soon = fixture.nativeElement.querySelector('.events-state--soon');

    expect(http.calls.length).toBe(0);
    expect(soon).toBeTruthy();
    expect(soon.textContent).toContain('Coming soon');
  });

  it('renders no filters and no event cards when the feed flag is false', () => {
    const fixture = createFixture(makeHttp(() => of(makeFeed())), false);

    expect(fixture.nativeElement.querySelector('.filters')).toBeFalsy();
    expect(fixture.nativeElement.querySelectorAll('.event-card').length).toBe(0);
  });
});
