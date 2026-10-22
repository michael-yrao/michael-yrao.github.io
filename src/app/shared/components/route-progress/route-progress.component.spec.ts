import { TestBed } from '@angular/core/testing';
import { NavigationCancel, NavigationEnd, NavigationStart, Router, RouterEvent } from '@angular/router';
import { Subject } from 'rxjs';
import { RouteProgressComponent } from './route-progress.component';

const URL = '/practice';

describe('RouteProgressComponent', () => {
  let events: Subject<RouterEvent>;

  beforeEach(() => {
    vi.useFakeTimers();
    events = new Subject<RouterEvent>();
    TestBed.configureTestingModule({
      imports: [RouteProgressComponent],
      providers: [{ provide: Router, useValue: { events } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  const cases: { name: string; steps: { event: RouterEvent; waitMs: number }[]; isShown: boolean }[] = [
    {
      name: 'shown once a navigation outlasts the delay',
      steps: [{ event: new NavigationStart(1, URL), waitMs: 200 }],
      isShown: true,
    },
    {
      name: 'never shown when the navigation ends inside the delay',
      steps: [
        { event: new NavigationStart(1, URL), waitMs: 50 },
        { event: new NavigationEnd(1, URL, URL), waitMs: 200 },
      ],
      isShown: false,
    },
    {
      name: 'hidden again when a shown navigation is cancelled',
      steps: [
        { event: new NavigationStart(1, URL), waitMs: 200 },
        { event: new NavigationCancel(1, URL, 'cancelled'), waitMs: 0 },
      ],
      isShown: false,
    },
  ];

  it.each(cases)('$name', ({ steps, isShown }) => {
    const fixture = TestBed.createComponent(RouteProgressComponent);
    for (const { event, waitMs } of steps) {
      events.next(event);
      vi.advanceTimersByTime(waitMs);
    }
    fixture.detectChanges();
    const bar: HTMLElement = fixture.nativeElement.querySelector('.route-progress');
    expect(bar.classList.contains('route-progress--on')).toBe(isShown);
  });
});
