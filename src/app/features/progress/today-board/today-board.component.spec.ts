import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TodayBoardComponent } from './today-board.component';
import { Schedule } from '../../../core/models/progress.model';
import { todayLocalISO } from '../../../core/utils/local-date';

// Reuses the SAME local-date function the component uses (not a hand-rolled
// `toISOString()`, which is UTC and can be off by a day) so "today" in the fixture always
// matches whatever the component computes, regardless of the machine's timezone or the
// date the test actually runs on.
function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    weekOf: '2026-09-21',
    days: [
      {
        date: todayLocalISO(),
        weekday: 'Today',
        label: 'Test day',
        units: 5,
        items: [
          { lcNumber: 22, title: 'Generate Parentheses', technique: 'Backtracking',
            startComfort: '🔴', done: false },
          { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS',
            startComfort: '🟢', done: true },
        ],
      },
    ],
    ...overrides,
  };
}

function createFixture(schedule: Schedule | null | undefined) {
  // RouterLink (the Visualize link, rendered when a schedule item's lcNumber has a
  // visualizer route) needs an injectable ActivatedRoute the moment it's actually
  // instantiated in the DOM — an empty route config is enough, nothing navigates here.
  TestBed.configureTestingModule({
    imports: [TodayBoardComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TodayBoardComponent);
  fixture.componentRef.setInput('schedule', schedule);
  fixture.detectChanges();
  return fixture;
}

describe('TodayBoardComponent', () => {
  it("renders today's items and a correct N of M done count for a mixed done/not-done day", () => {
    const fixture = createFixture(makeSchedule());

    const head = fixture.nativeElement.querySelector('.today-board__count');
    expect(head?.textContent).toContain('1 of 2 done today');

    const rows = fixture.nativeElement.querySelectorAll('.today-board__row');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Generate Parentheses');
    expect(fixture.nativeElement.textContent).toContain('Same Tree');

    // The done row and the not-done row are distinguishable in the DOM.
    const doneRows = fixture.nativeElement.querySelectorAll('.today-board__row--done');
    expect(doneRows.length).toBe(1);
    expect(doneRows[0].textContent).toContain('Same Tree');
  });

  it('shows M of M when every item for today is done', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = schedule.days[0].items.map((item) => ({ ...item, done: true }));

    const fixture = createFixture(schedule);

    const head = fixture.nativeElement.querySelector('.today-board__count');
    expect(head?.textContent).toContain('2 of 2 done today');
    expect(fixture.nativeElement.querySelectorAll('.today-board__row--done').length).toBe(2);
  });

  it('shows the friendly hint and no rows when no day matches today', () => {
    const schedule = makeSchedule({
      days: [
        {
          date: '1999-01-01', // deliberately not today, under any timezone
          weekday: 'Monday',
          label: 'Not today',
          units: 5,
          items: [{ lcNumber: 1, title: 'Two Sum', technique: 'Hash Map',
                    startComfort: '🟢', done: false }],
        },
      ],
    });

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    const hint = fixture.nativeElement.querySelector('.today-board__hint');
    expect(hint?.textContent).toContain('No board scheduled for today');
  });

  it('shows the friendly hint with no crash when schedule is null', () => {
    const fixture = createFixture(null);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.today-board__hint')).toBeTruthy();
  });

  it('shows the friendly hint with no crash when schedule is undefined', () => {
    const fixture = createFixture(undefined);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.today-board__hint')).toBeTruthy();
  });

  it("shows the friendly hint when today's day exists but has no items", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.today-board__hint')).toBeTruthy();
  });
});
