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
            startComfort: '🔴', difficulty: 'Medium', done: false },
          { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS',
            startComfort: '🟢', difficulty: 'Easy', done: true },
        ],
      },
    ],
    ...overrides,
  };
}

function createFixture(
  schedule: Schedule | null | undefined,
  effortCeiling?: number,
  effortFloor?: number,
) {
  // RouterLink (the Visualize link, rendered when a schedule item's lcNumber has a
  // visualizer route) needs an injectable ActivatedRoute the moment it's actually
  // instantiated in the DOM — an empty route config is enough, nothing navigates here.
  TestBed.configureTestingModule({
    imports: [TodayBoardComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TodayBoardComponent);
  fixture.componentRef.setInput('schedule', schedule);
  if (effortCeiling !== undefined) fixture.componentRef.setInput('effortCeiling', effortCeiling);
  if (effortFloor !== undefined) fixture.componentRef.setInput('effortFloor', effortFloor);
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
                    startComfort: '🟢', difficulty: 'Easy', done: false }],
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

  // ── Round 2: the workload bar + per-item difficulty tag ──────────────────────────
  it('renders "today: {units} / {ceiling} units · Moderate" between the floor and 0.9x ceiling', () => {
    // units=5, ceiling=8, floor=3 -> 5 is above the floor and below 0.9*8=7.2 -> Moderate.
    const fixture = createFixture(makeSchedule(), 8, 3);

    const label = fixture.nativeElement.querySelector('.today-board__workload-label');
    expect(label?.textContent).toContain('today: 5 / 8 units · Moderate');
    const fill = fixture.nativeElement.querySelector('.today-board__workload-fill--moderate');
    expect(fill).toBeTruthy();
  });

  it('bands as Heavy at >= 0.9x ceiling', () => {
    // units=5, ceiling=5 -> 5 >= 0.9*5=4.5 -> Heavy.
    const fixture = createFixture(makeSchedule(), 5, 3);

    const label = fixture.nativeElement.querySelector('.today-board__workload-label');
    expect(label?.textContent).toContain('Heavy');
    expect(fixture.nativeElement.querySelector('.today-board__workload-fill--heavy')).toBeTruthy();
  });

  it('bands as Light at or below the floor', () => {
    // units=5, ceiling=20, floor=5 -> 5 <= floor -> Light.
    const fixture = createFixture(makeSchedule(), 20, 5);

    const label = fixture.nativeElement.querySelector('.today-board__workload-label');
    expect(label?.textContent).toContain('Light');
    expect(fixture.nativeElement.querySelector('.today-board__workload-fill--light')).toBeTruthy();
  });

  it('renders no workload bar when the day has no board (empty/no-board day -> no bar)', () => {
    const fixture = createFixture(null, 8, 3);

    expect(fixture.nativeElement.querySelector('.today-board__workload-bar')).toBeFalsy();
  });

  it('renders no workload bar when effortCeiling is not provided', () => {
    const fixture = createFixture(makeSchedule());

    expect(fixture.nativeElement.querySelector('.today-board__workload-bar')).toBeFalsy();
  });

  it("shows each item's difficulty tag next to the comfort glyph", () => {
    const fixture = createFixture(makeSchedule());

    expect(fixture.nativeElement.querySelector('.tag--medium')?.textContent).toContain('Medium');
    expect(fixture.nativeElement.querySelector('.tag--easy')?.textContent).toContain('Easy');
  });

  it('omits the difficulty tag when difficulty is null (an untracked number)', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 39, title: 'Combination Sum', technique: 'Backtracking',
        startComfort: null, difficulty: null, done: false },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.tag--easy, .tag--medium, .tag--hard')).toBeFalsy();
  });

  // ── Round 3 item 1: difficulty tag moves to the END of the row ───────────────────
  it('renders the difficulty tag as the LAST element in the row (after the links)', () => {
    const fixture = createFixture(makeSchedule());

    const row = fixture.nativeElement.querySelector('.today-board__row');
    const last = row?.lastElementChild as HTMLElement;
    expect(last?.classList.contains('today-board__difficulty')).toBe(true);
  });

  // ── Round 3 item 5: units explainer affordance on the workload bar ───────────────
  it('renders an info affordance next to the workload label explaining what units means', () => {
    const fixture = createFixture(makeSchedule(), 8, 3);

    const info = fixture.nativeElement.querySelector('.today-board__info');
    expect(info).toBeTruthy();
    expect(info.getAttribute('title')?.toLowerCase()).toContain('comfort');
    expect(info.getAttribute('title')?.toLowerCase()).toContain('difficulty');
  });

  it('renders no info affordance when there is no workload bar', () => {
    const fixture = createFixture(null, 8, 3);

    expect(fixture.nativeElement.querySelector('.today-board__info')).toBeFalsy();
  });
});
