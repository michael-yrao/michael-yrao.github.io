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

// A full 7-day week (today + 6 other, non-today, dates) — for exercising the selector strip
// and expanded mode, where a single-day fixture can't distinguish "today's day" from
// "some other day".
function makeWeekSchedule(): Schedule {
  const otherDates = ['2020-01-06', '2020-01-07', '2020-01-08', '2020-01-09', '2020-01-10', '2020-01-11'];
  return makeSchedule({
    days: [
      ...otherDates.slice(0, 3).map((date, i) => ({
        date,
        weekday: `Day${i}`,
        label: null,
        units: 1,
        items: [{ lcNumber: 200 + i, title: `Problem ${i}`, technique: 'Sliding Window',
          startComfort: null, difficulty: null, done: false }],
      })),
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
      ...otherDates.slice(3).map((date, i) => ({
        date,
        weekday: `Day${i + 3}`,
        label: null,
        units: 1,
        items: [] as Schedule['days'][number]['items'],
      })),
    ],
  });
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
  it("renders today's items (default-selected day) and a correct N of M done count", () => {
    const fixture = createFixture(makeSchedule());

    const head = fixture.nativeElement.querySelector('.today-board__count');
    expect(head?.textContent).toContain('1 of 2 done');

    const rows = fixture.nativeElement.querySelectorAll('.today-board__row');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Generate Parentheses');
    expect(fixture.nativeElement.textContent).toContain('Same Tree');

    // The done row and the not-done row are distinguishable in the DOM.
    const doneRows = fixture.nativeElement.querySelectorAll('.today-board__row--done');
    expect(doneRows.length).toBe(1);
    expect(doneRows[0].textContent).toContain('Same Tree');
  });

  it('shows M of M when every item for the selected day is done', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = schedule.days[0].items.map((item) => ({ ...item, done: true }));

    const fixture = createFixture(schedule);

    const head = fixture.nativeElement.querySelector('.today-board__count');
    expect(head?.textContent).toContain('2 of 2 done');
    expect(fixture.nativeElement.querySelectorAll('.today-board__row--done').length).toBe(2);
  });

  it('falls back to the first day of the week when today is not in the schedule', () => {
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

    // First (only) day is selected by default and its item renders.
    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Two Sum');
    expect(fixture.nativeElement.querySelector('.today-board__hint')).toBeFalsy();
  });

  it('shows the friendly hint with no crash when schedule is null', () => {
    const fixture = createFixture(null);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    const hint = fixture.nativeElement.querySelector('.today-board__hint');
    expect(hint?.textContent).toContain('No schedule loaded for this week.');
  });

  it('shows the friendly hint with no crash when schedule is undefined', () => {
    const fixture = createFixture(undefined);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.today-board__hint')).toBeTruthy();
  });

  it('shows "Nothing scheduled." when the selected day exists but has no items', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(0);
    const hint = fixture.nativeElement.querySelector('.today-board__hint');
    expect(hint?.textContent).toContain('Nothing scheduled.');
  });

  // ── Day-selector strip ────────────────────────────────────────────────────────────
  it('renders one selector button per day, marks today, and marks the effective day active', () => {
    const fixture = createFixture(makeWeekSchedule());

    const buttons = fixture.nativeElement.querySelectorAll('.today-board__day-btn');
    expect(buttons.length).toBe(7);

    const todayBtn = fixture.nativeElement.querySelector('.today-board__day-btn--today');
    expect(todayBtn).toBeTruthy();

    const activeBtn = fixture.nativeElement.querySelector('.today-board__day-btn--active');
    expect(activeBtn).toBeTruthy();
    expect(activeBtn.getAttribute('aria-pressed')).toBe('true');
    // Today has no explicit selection yet, so today's own button is both today and active.
    expect(activeBtn).toBe(todayBtn);
  });

  it('clicking a different day button switches the selected day and its item list', () => {
    const fixture = createFixture(makeWeekSchedule());

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__day-btn'),
    );
    // First button is a non-today day seeded with "Problem 0".
    buttons[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Problem 0');
    expect(fixture.nativeElement.querySelector('.today-board__count')?.textContent).toContain('0 of 1 done');
    expect(buttons[0].classList.contains('today-board__day-btn--active')).toBe(true);
  });

  // ── Expand/collapse ───────────────────────────────────────────────────────────────
  it('starts collapsed, showing only the selected day', () => {
    const fixture = createFixture(makeWeekSchedule());

    expect(fixture.nativeElement.querySelectorAll('.today-board__day').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.today-board__expand-toggle')?.textContent).toContain(
      'Expand week',
    );
  });

  it('expanding renders all 7 days stacked, each with its own header', () => {
    const fixture = createFixture(makeWeekSchedule());

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__expand-toggle');
    toggle.click();
    fixture.detectChanges();

    const dayBlocks = fixture.nativeElement.querySelectorAll('.today-board__day');
    expect(dayBlocks.length).toBe(7);
    expect(toggle.textContent).toContain('Collapse');

    const badge = fixture.nativeElement.querySelector('.today-board__badge');
    expect(badge?.textContent).toContain('Today');

    // A day seeded with zero items shows its own "Nothing scheduled." hint inline.
    expect(fixture.nativeElement.textContent).toContain('Nothing scheduled.');
  });

  it('collapsing after expanding returns to the single selected-day view', () => {
    const fixture = createFixture(makeWeekSchedule());
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__expand-toggle');

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.today-board__day').length).toBe(7);

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.today-board__day').length).toBe(0);
  });

  // ── Round 2: the workload bar + per-item difficulty tag ──────────────────────────
  it('renders "{units} / {ceiling} units · Moderate" between the floor and 0.9x ceiling', () => {
    // units=5, ceiling=8, floor=3 -> 5 is above the floor and below 0.9*8=7.2 -> Moderate.
    const fixture = createFixture(makeSchedule(), 8, 3);

    const label = fixture.nativeElement.querySelector('.today-board__workload-label');
    expect(label?.textContent).toContain('5 / 8 units · Moderate');
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

  // ── PART 2: the technique tag is gone — difficulty tag is followed straight by links ─
  it('renders the difficulty tag immediately after the title, with no technique tag at all', () => {
    const fixture = createFixture(makeSchedule());

    const row = fixture.nativeElement.querySelector('.today-board__row');
    const children = Array.from(row.children) as HTMLElement[];
    const titleIndex = children.findIndex((el) => el.classList.contains('today-board__title'));
    const nextEl = children[titleIndex + 1];
    expect(nextEl.classList.contains('tag--medium')).toBe(true);
    expect(nextEl.textContent).toContain('Medium');

    // Links directly follow the difficulty tag — no technique tag in between.
    const linksEl = children[titleIndex + 2];
    expect(linksEl.classList.contains('today-board__links')).toBe(true);
    expect(children.length).toBe(titleIndex + 3);

    expect(row.textContent).not.toContain('Backtracking');
  });

  it('renders no technique tag anywhere, even though items carry a technique field', () => {
    const fixture = createFixture(makeSchedule());

    const rows = fixture.nativeElement.querySelectorAll('.today-board__row');
    for (const row of Array.from(rows) as HTMLElement[]) {
      expect(row.textContent).not.toContain('Backtracking');
      expect(row.textContent).not.toContain('Tree-DFS');
    }
  });

  // ── Round 4 item 2: units explainer is a custom, instant popover (not the native `title`
  // tooltip, which is slow and invisible on touch) ─────────────────────────────────
  it('renders an info affordance with a custom popover bubble (not a native title tooltip)', () => {
    const fixture = createFixture(makeSchedule(), 8, 3);

    const info: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__info');
    expect(info).toBeTruthy();
    expect(info.getAttribute('title')).toBeFalsy();

    const bubble = fixture.nativeElement.querySelector('.today-board__info-bubble');
    expect(bubble).toBeTruthy();
    expect(bubble.textContent).toContain('effort load');
    expect(bubble.textContent).toContain('daily ceiling');
    expect(info.getAttribute('aria-describedby')).toBe(bubble.id);
  });

  it('toggles the popover open/closed on click (tap support — no hover on touch)', () => {
    const fixture = createFixture(makeSchedule(), 8, 3);

    const info: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__info');
    const wrap = () => fixture.nativeElement.querySelector('.today-board__info-wrap');

    expect(wrap()?.classList.contains('today-board__info-wrap--open')).toBe(false);

    info.click();
    fixture.detectChanges();
    expect(wrap()?.classList.contains('today-board__info-wrap--open')).toBe(true);

    info.click();
    fixture.detectChanges();
    expect(wrap()?.classList.contains('today-board__info-wrap--open')).toBe(false);
  });

  it('renders no info affordance when there is no workload bar', () => {
    const fixture = createFixture(null, 8, 3);

    expect(fixture.nativeElement.querySelector('.today-board__info')).toBeFalsy();
  });
});
