import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TodayBoardComponent, endNoteMeaning } from './today-board.component';
import { ProblemProgress, Schedule, ScheduleItem } from '../../../core/models/progress.model';
import { LoadStatus } from '../../../core/services/progress.service';
import { shortMonthDay, todayLocalISO } from '../../../core/utils/local-date';

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
          // 9999 is deliberately unregistered — the "no viz route" row must never gain a page.
          { lcNumber: 9999, title: 'Unvisualized Problem', technique: 'Backtracking',
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
          { lcNumber: 9999, title: 'Unvisualized Problem', technique: 'Backtracking',
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

// A minimal ProblemProgress, for the trend-panel tests below — only lcNumber/title vary per
// test; the rest just needs to be a valid, renderable ProblemTimelineComponent input.
function makeProblemProgress(overrides: Partial<ProblemProgress> = {}): ProblemProgress {
  return {
    lcNumber: 100,
    title: 'Same Tree',
    comfort: '🟢',
    level: 2,
    streak: 2,
    repDates: ['2026-09-01'],
    timeline: [{ date: '2026-09-01', comfort: '🟢', level: 2 }],
    ...overrides,
  };
}

function createFixture(
  schedule: Schedule | null | undefined,
  effortCeiling?: number,
  effortFloor?: number,
  details?: ProblemProgress[] | null,
  detailsStatus?: LoadStatus,
  detailsError?: string | null,
) {
  // RouterLink (the status badge's walkthrough link, rendered when a schedule item's
  // lcNumber has a visualizer route) needs an injectable ActivatedRoute the moment it's
  // actually instantiated in the DOM — an empty route config is enough, nothing navigates here.
  TestBed.configureTestingModule({
    imports: [TodayBoardComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TodayBoardComponent);
  fixture.componentRef.setInput('schedule', schedule);
  if (effortCeiling !== undefined) fixture.componentRef.setInput('effortCeiling', effortCeiling);
  if (effortFloor !== undefined) fixture.componentRef.setInput('effortFloor', effortFloor);
  if (details !== undefined) fixture.componentRef.setInput('details', details);
  if (detailsStatus !== undefined) fixture.componentRef.setInput('detailsStatus', detailsStatus);
  if (detailsError !== undefined) fixture.componentRef.setInput('detailsError', detailsError);
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
    expect(fixture.nativeElement.textContent).toContain('Unvisualized Problem');
    expect(fixture.nativeElement.textContent).toContain('Same Tree');

    // The done row and the not-done row are distinguishable in the DOM.
    const doneRows = fixture.nativeElement.querySelectorAll('.today-board__row--done');
    expect(doneRows.length).toBe(1);
    expect(doneRows[0].textContent).toContain('Same Tree');
  });

  // ── The technique-naming day label is dropped from the board (recognition-gate spoiler) ─
  it('renders no day-label element or text in the collapsed view, even though the fixture carries one', () => {
    const fixture = createFixture(makeSchedule());

    expect(fixture.nativeElement.querySelector('.today-board__label')).toBeFalsy();
    expect(fixture.nativeElement.textContent).not.toContain('Test day');
  });

  it('renders no day-label element or text anywhere after expanding the week', () => {
    const fixture = createFixture(makeWeekSchedule());

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.today-board__expand-toggle',
    );
    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.today-board__day-label')).toBeFalsy();
    expect(fixture.nativeElement.textContent).not.toContain('Test day');
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

  // ── The leading status badge replaces the check + the after-title glyph ────────────
  it("renders the boxed </> status link as the row's FIRST child, for a done row with a registered walkthrough route", () => {
    const fixture = createFixture(makeSchedule()); // lcNumber 100 (Same Tree) has a real route, done: true

    expect(fixture.nativeElement.textContent).not.toContain('Visualize');

    const badge: HTMLAnchorElement = fixture.nativeElement.querySelector('.today-board__status--link');
    expect(badge).toBeTruthy();
    expect(badge.tagName).toBe('A');
    expect(badge.textContent).toContain('</>');
    expect(badge.title).toBe('Solution walkthrough');
    expect(badge.getAttribute('aria-label')).toBe('Solution walkthrough for #100, done');

    const row = badge.closest('.today-board__row')!;
    const children = Array.from(row.children) as HTMLElement[];
    expect(children[0]).toBe(badge);
    // A done row WITH a route keeps the link form (a done row with NO route falls back to
    // the span instead — covered by the two tests below).
    expect(row.classList.contains('today-board__row--done')).toBe(true);

    // LeetCode still holds its own separate link, never the status badge.
    const links = row.querySelector('.today-board__links')!;
    expect(links.contains(badge)).toBe(false);
    const lcLink: HTMLAnchorElement = links.querySelector('a')!;
    expect(lcLink.textContent?.trim()).toBe('↗');
    expect(lcLink.getAttribute('aria-label')).toContain('LeetCode');
  });

  it('renders a plain SPAN status badge (○, aria-label "not done") for a not-done row with no registered walkthrough route', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 39, title: 'Combination Sum', technique: 'Backtracking',
        startComfort: null, difficulty: null, done: false },
    ];

    const fixture = createFixture(schedule);

    const badge: HTMLElement = fixture.nativeElement.querySelector('.today-board__status');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.textContent?.trim()).toBe('○');
    expect(badge.getAttribute('aria-label')).toBe('not done');
    expect(fixture.nativeElement.querySelector('.today-board__status--link')).toBeFalsy();
  });

  it('renders a plain SPAN status badge (✓, aria-label "done") for a done row with no registered walkthrough route', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 39, title: 'Combination Sum', technique: 'Backtracking',
        startComfort: null, difficulty: null, done: true },
    ];

    const fixture = createFixture(schedule);

    const badge: HTMLElement = fixture.nativeElement.querySelector('.today-board__status');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.textContent?.trim()).toBe('✓');
    expect(badge.getAttribute('aria-label')).toBe('done');
    expect(fixture.nativeElement.querySelector('.today-board__status--link')).toBeFalsy();
  });

  // ── Round 5: kind === 'new' / 'probe' chips; the 'moved' tag renders no marker ──────
  it("renders a 'new' chip after the title for kind === 'new', with no difficulty tag when difficulty is null", () => {
    // The real regenerated-contract row: url IS present for a 🆕 row (gamify.py reads the
    // row's own [LC] link) — a missing url never means "untracked" for one of these.
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 39, title: 'Combination Sum', technique: null, startComfort: null,
        difficulty: null, url: 'https://leetcode.com/problems/combination-sum/',
        done: false, kind: 'new', tags: ['new'] },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.tag--new')?.textContent).toContain('new');
    expect(fixture.nativeElement.querySelector('.tag--easy, .tag--medium, .tag--hard')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('#39');
    const lcLink: HTMLAnchorElement = fixture.nativeElement.querySelector('.today-board__links a');
    expect(lcLink.textContent?.trim()).toBe('↗');
    expect(lcLink.getAttribute('aria-label')).toContain('LeetCode');
  });

  it('renders the status badge as a GitHub solution-file link when the row has no walkthrough route but has a `file` and a repo ref', () => {
    // 9999 is deliberately unregistered — see makeSchedule()'s own comment.
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 9999, title: 'Unvisualized Problem', technique: 'Backtracking', startComfort: null,
        difficulty: null, done: false, file: 'dsa/leetcode/backtracking/9999_unvisualized_problem.py' },
    ];
    const fixture = createFixture(schedule);
    fixture.componentRef.setInput('repoRef', { owner: 'someone', repo: 'their-log', branch: 'dev' });
    fixture.detectChanges();

    const badge: HTMLAnchorElement = fixture.nativeElement.querySelector('.today-board__status');
    expect(badge.tagName).toBe('A');
    expect(badge.classList.contains('today-board__status--github')).toBe(true);
    expect(badge.textContent?.trim()).toBe('○');
    expect(badge.getAttribute('href')).toBe(
      'https://github.com/someone/their-log/blob/dev/dsa/leetcode/backtracking/9999_unvisualized_problem.py',
    );
    expect(badge.getAttribute('title')).toBe('Solution on GitHub');
    expect(badge.getAttribute('aria-label')).toBe('Solution source for #9999 on GitHub, not done');
    expect(badge.getAttribute('target')).toBe('_blank');
  });

  it('renders the status badge as a GitHub link with ✓ for a DONE row with no walkthrough route', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 9999, title: 'Unvisualized Problem', technique: 'Backtracking', startComfort: null,
        difficulty: null, done: true, file: 'dsa/leetcode/backtracking/9999_unvisualized_problem.py' },
    ];
    const fixture = createFixture(schedule);
    fixture.componentRef.setInput('repoRef', { owner: 'someone', repo: 'their-log', branch: 'dev' });
    fixture.detectChanges();

    const badge: HTMLAnchorElement = fixture.nativeElement.querySelector('.today-board__status');
    expect(badge.tagName).toBe('A');
    expect(badge.textContent?.trim()).toBe('✓');
    expect(badge.getAttribute('aria-label')).toBe('Solution source for #9999 on GitHub, done');
  });

  it('renders a plain SPAN status badge (no GitHub link) when the row has a `file` but no repo ref is known yet', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 9999, title: 'Unvisualized Problem', technique: 'Backtracking', startComfort: null,
        difficulty: null, done: false, file: 'dsa/leetcode/backtracking/9999_unvisualized_problem.py' },
    ];
    const fixture = createFixture(schedule);   // repoRef left at its null default

    const badge: HTMLElement = fixture.nativeElement.querySelector('.today-board__status');
    expect(badge.tagName).toBe('SPAN');
    expect(fixture.nativeElement.querySelector('.today-board__status--link')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.today-board__status--github')).toBeFalsy();
  });

  it('keeps the `</>` walkthrough link (never the GitHub fallback) for a row with a registered viz route, even with a `file` and a repo ref', () => {
    const schedule = makeSchedule(); // lcNumber 100 (Same Tree) has a real route
    schedule.days[0].items[1] = { ...schedule.days[0].items[1], file: 'dsa/leetcode/trees/100_same_tree.py' };
    const fixture = createFixture(schedule);
    fixture.componentRef.setInput('repoRef', { owner: 'someone', repo: 'their-log', branch: 'dev' });
    fixture.detectChanges();

    const badge: HTMLAnchorElement = fixture.nativeElement.querySelector('.today-board__status--link');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('</>');
    expect(fixture.nativeElement.querySelector('.today-board__status--github')).toBeFalsy();
  });

  it("renders an ordinary row with no chips when tags are present but kind is absent (older/plain contract rows)", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 42, title: 'Trapping Rain Water', technique: 'Two Pointers', startComfort: '🟢',
        difficulty: 'Hard', done: false, tags: ['protected', 'backfill'] },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.tag--new')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tag--probe')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.today-board__moved')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tag--hard')?.textContent).toContain('Hard');
  });

  it("renders a 'probe' chip for kind === 'probe', and no moved marker even when tags include 'moved'", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 200, title: 'Number of Islands', technique: 'Graph-DFS', startComfort: '🟡',
        difficulty: 'Medium', done: false, kind: 'probe', tags: ['probe', 'moved'] },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.tag--probe')?.textContent).toContain('probe');
    expect(fixture.nativeElement.querySelector('.today-board__moved')).toBeFalsy();
    expect(fixture.nativeElement.textContent).not.toContain('→');
  });

  // ── Round 5: consecutive kind === 'complexity' items collapse into one gate row ─────
  it("collapses 3 consecutive kind === 'complexity' items into one 'Complexity gate' row with a numbers-only subtitle", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 226, title: 'Re-ask A', technique: 'Complexity', startComfort: null,
        difficulty: null, done: true, kind: 'complexity', tags: ['probe'] },
      { lcNumber: 211, title: 'Re-ask B', technique: 'Complexity', startComfort: null,
        difficulty: null, done: false, kind: 'complexity', tags: ['probe'] },
      { lcNumber: 778, title: 'Re-ask C', technique: 'Complexity', startComfort: null,
        difficulty: null, done: false, kind: 'complexity', tags: ['probe'] },
    ];

    const fixture = createFixture(schedule);

    const rows = fixture.nativeElement.querySelectorAll('.today-board__row');
    expect(rows.length).toBe(1); // 3 items collapsed into ONE row

    const gateRow = rows[0] as HTMLElement;
    expect(gateRow.classList.contains('today-board__row--gate')).toBe(true);
    expect(gateRow.querySelector('.today-board__title')?.textContent).toBe('Complexity gate');
    expect(gateRow.querySelector('.today-board__gate-sub')?.textContent).toBe('3 re-asks · 226 · 211 · 778');
    // No links on the gate row — the re-ask answers live off the board by design.
    expect(gateRow.querySelector('.today-board__links')).toBeFalsy();
    expect(gateRow.querySelector('a')).toBeFalsy();

    // Not all done -> the gate itself reads not-done.
    expect(gateRow.classList.contains('today-board__row--done')).toBe(false);
    expect(gateRow.querySelector('.today-board__status')?.textContent).toBe('○');

    // The gate counts as ONE item toward both doneCount and totalCount.
    expect(fixture.nativeElement.querySelector('.today-board__count')?.textContent).toContain('0 of 1 done');
  });

  it("marks the collapsed gate row done only once every member item is done", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 226, title: 'Re-ask A', technique: 'Complexity', startComfort: null,
        difficulty: null, done: true, kind: 'complexity' },
      { lcNumber: 211, title: 'Re-ask B', technique: 'Complexity', startComfort: null,
        difficulty: null, done: true, kind: 'complexity' },
    ];

    const fixture = createFixture(schedule);

    const gateRow = fixture.nativeElement.querySelector('.today-board__row--gate')!;
    expect(gateRow.classList.contains('today-board__row--done')).toBe(true);
    expect(gateRow.querySelector('.today-board__status')?.textContent).toBe('✓');
    expect(fixture.nativeElement.querySelector('.today-board__count')?.textContent).toContain('1 of 1 done');
  });

  it("shows a partial 'N of M done' line on the gate row when some, but not all, members are done", () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      {
        lcNumber: 226,
        title: 'Re-ask A',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: true,
        kind: 'complexity',
      },
      {
        lcNumber: 211,
        title: 'Re-ask B',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: false,
        kind: 'complexity',
      },
      {
        lcNumber: 778,
        title: 'Re-ask C',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: false,
        kind: 'complexity',
      },
    ];

    const fixture = createFixture(schedule);

    const gateRow = fixture.nativeElement.querySelector('.today-board__row--gate')!;
    const progressLine = gateRow.querySelector('.today-board__gate-progress');
    expect(progressLine).toBeTruthy();
    expect(progressLine!.textContent).toContain('1 of 3 done');
  });

  it('shows no partial-progress line on the gate row when 0 members are done', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      {
        lcNumber: 226,
        title: 'Re-ask A',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: false,
        kind: 'complexity',
      },
      {
        lcNumber: 211,
        title: 'Re-ask B',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: false,
        kind: 'complexity',
      },
      {
        lcNumber: 778,
        title: 'Re-ask C',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: false,
        kind: 'complexity',
      },
    ];

    const fixture = createFixture(schedule);

    const gateRow = fixture.nativeElement.querySelector('.today-board__row--gate')!;
    expect(gateRow.querySelector('.today-board__gate-progress')).toBeFalsy();
  });

  it('shows no partial-progress line on the gate row when all members are done', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      {
        lcNumber: 226,
        title: 'Re-ask A',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: true,
        kind: 'complexity',
      },
      {
        lcNumber: 211,
        title: 'Re-ask B',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: true,
        kind: 'complexity',
      },
      {
        lcNumber: 778,
        title: 'Re-ask C',
        technique: 'Complexity',
        startComfort: null,
        difficulty: null,
        done: true,
        kind: 'complexity',
      },
    ];

    const fixture = createFixture(schedule);

    const gateRow = fixture.nativeElement.querySelector('.today-board__row--gate')!;
    expect(gateRow.querySelector('.today-board__gate-progress')).toBeFalsy();
  });

  // ── The rep's earned outcome (endComfort/endNote/nextReview) ───────────────────────
  it('shows the earned outcome (start→end glyph pair only, no inline note) as a BUTTON, with the note code, its meaning, and the next-review date all moved into the popover bubble', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-10-21' },
    ];

    const fixture = createFixture(schedule);

    const outcome: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__outcome');
    expect(outcome).toBeTruthy();
    expect(outcome.tagName).toBe('BUTTON');
    expect(outcome.textContent).toContain('🔴→🟢');
    // The note code no longer sits inline on the row — only the popover bubble carries it.
    expect(outcome.textContent).not.toContain('s2');
    expect(fixture.nativeElement.querySelector('.today-board__comfort')).toBeFalsy();

    const bubble = fixture.nativeElement.querySelector('.today-board__outcome-bubble');
    expect(bubble).toBeTruthy();
    expect(bubble.textContent).toContain('s2');
    expect(bubble.textContent).toContain('clean streak 2');
    expect(bubble.textContent).toContain('next Oct 21');
    expect(outcome.getAttribute('aria-describedby')).toBe(bubble.id);
    // The fixture's own title ("Same Tree") carries a space — the id must not, or
    // aria-describedby (a whitespace-separated id list) points at nothing.
    expect(bubble.id).not.toMatch(/\s/);

    // The aria-label stays short (just the raw note code) — the meaning and the date live in
    // the bubble alone, reached via aria-describedby, so a screen reader hears each once.
    expect(outcome.getAttribute('aria-label')).toContain('s2');
    expect(outcome.getAttribute('aria-label')).not.toContain('clean streak');
    expect(outcome.getAttribute('aria-label')).not.toContain('next review');
    expect(fixture.nativeElement.querySelector('.tag--next')).toBeFalsy();
  });

  it('toggles the outcome popover open/closed on click (tap support — no hover on touch)', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-10-21' },
    ];

    const fixture = createFixture(schedule);
    const outcome: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__outcome');
    const wrap = () => fixture.nativeElement.querySelector('.today-board__outcome-wrap');

    expect(wrap()?.classList.contains('today-board__outcome-wrap--open')).toBe(false);

    outcome.click();
    fixture.detectChanges();
    expect(wrap()?.classList.contains('today-board__outcome-wrap--open')).toBe(true);

    outcome.click();
    fixture.detectChanges();
    expect(wrap()?.classList.contains('today-board__outcome-wrap--open')).toBe(false);
  });

  it('opening a second row\'s outcome popover closes the first (one open at a time)', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-10-21' },
      { lcNumber: 101, title: 'Same Tree Two', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-11-03' },
    ];

    const fixture = createFixture(schedule);
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__outcome'),
    );
    const wraps = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.today-board__outcome-wrap')) as HTMLElement[];

    buttons[0].click();
    fixture.detectChanges();
    expect(wraps()[0].classList.contains('today-board__outcome-wrap--open')).toBe(true);
    expect(wraps()[1].classList.contains('today-board__outcome-wrap--open')).toBe(false);

    buttons[1].click();
    fixture.detectChanges();
    expect(wraps()[0].classList.contains('today-board__outcome-wrap--open')).toBe(false);
    expect(wraps()[1].classList.contains('today-board__outcome-wrap--open')).toBe(true);
  });

  it('keys the outcome popover by day + row: the same problem done on two different days gets distinct bubble ids, and opening one does not open the other (expanded week view)', () => {
    const schedule = makeSchedule({
      days: [
        {
          date: '2020-01-06',
          weekday: 'Monday',
          label: null,
          units: 1,
          items: [
            { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
              difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-10-21' },
          ],
        },
        {
          date: '2020-01-13',
          weekday: 'Monday',
          label: null,
          units: 1,
          items: [
            { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
              difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's2', nextReview: '2026-11-04' },
          ],
        },
      ],
    });

    const fixture = createFixture(schedule);
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__expand-toggle');
    toggle.click();
    fixture.detectChanges();

    const bubbles: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__outcome-bubble'),
    );
    expect(bubbles.length).toBe(2);
    expect(bubbles[0].id).not.toBe(bubbles[1].id);

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__outcome'),
    );
    const wraps = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.today-board__outcome-wrap')) as HTMLElement[];

    buttons[0].click();
    fixture.detectChanges();
    expect(wraps()[0].classList.contains('today-board__outcome-wrap--open')).toBe(true);
    expect(wraps()[1].classList.contains('today-board__outcome-wrap--open')).toBe(false);
  });

  it('renders the outcome as a plain SPAN, with no wrap or bubble, when endComfort is set but there is no date and no note', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: null, nextReview: null },
    ];

    const fixture = createFixture(schedule);

    const outcome: HTMLElement = fixture.nativeElement.querySelector('.today-board__outcome');
    expect(outcome.tagName).toBe('SPAN');
    expect(fixture.nativeElement.querySelector('.today-board__outcome-wrap')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.today-board__outcome-bubble')).toBeFalsy();
  });

  it('opens the popover on a note alone (no nextReview): the bubble shows the note\'s meaning with no "next" line', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 'prov', nextReview: null },
    ];

    const fixture = createFixture(schedule);

    const outcome: HTMLElement = fixture.nativeElement.querySelector('.today-board__outcome');
    expect(outcome.tagName).toBe('BUTTON');
    expect(fixture.nativeElement.querySelector('.today-board__outcome-wrap')).toBeTruthy();

    const bubble = fixture.nativeElement.querySelector('.today-board__outcome-bubble');
    expect(bubble.textContent).toContain('provisional clean');
    expect(bubble.textContent).not.toContain('next');
  });

  it('shows an unknown note code raw in the bubble, with no meaning and no " · " separator', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: 's7', nextReview: null },
    ];

    const fixture = createFixture(schedule);

    const outcome: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__outcome');
    const bubble = fixture.nativeElement.querySelector('.today-board__outcome-bubble');
    expect(bubble.textContent).toContain('s7');
    expect(bubble.textContent).not.toContain('·');
    expect(outcome.getAttribute('aria-label')).toContain('s7');
  });

  it('renders as today (plain comfort span, no outcome, no next tag) for a done row carrying none of the new outcome fields (older contract)', () => {
    const fixture = createFixture(makeSchedule());

    expect(fixture.nativeElement.querySelector('.today-board__outcome')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.tag--next')).toBeFalsy();
    const doneRow = fixture.nativeElement.querySelector('.today-board__row--done');
    expect(doneRow.querySelector('.today-board__comfort')?.textContent).toContain('🟢');

    // The existing children-count assertion for the not-done row still holds unmodified.
    const row = fixture.nativeElement.querySelector('.today-board__row');
    const children = Array.from(row.children) as HTMLElement[];
    const titleIndex = children.findIndex((el) => el.classList.contains('today-board__title'));
    const nextEl = children[titleIndex + 1];
    expect(nextEl.classList.contains('tag--medium')).toBe(true);
    const linksEl = children[titleIndex + 2];
    expect(linksEl.classList.contains('today-board__links')).toBe(true);
    expect(children.length).toBe(titleIndex + 3);
  });

  it('renders no note line in the bubble when endNote is null, but still shows the next-review date', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS', startComfort: '🔴',
        difficulty: 'Easy', done: true, endComfort: '🟢', endNote: null, nextReview: '2026-10-21' },
    ];

    const fixture = createFixture(schedule);

    const outcome = fixture.nativeElement.querySelector('.today-board__outcome');
    expect(outcome).toBeTruthy();
    expect(outcome.textContent).toContain('🔴→🟢');

    const bubble = fixture.nativeElement.querySelector('.today-board__outcome-bubble');
    expect(bubble.querySelector('b')).toBeFalsy();
    expect(bubble.textContent).toContain('next Oct 21');
  });

  it('renders no next-rep tag on a not-done row even when nextReview would otherwise be absent', () => {
    const fixture = createFixture(makeSchedule());

    const notDoneRow = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__row'),
    ).find((row) => !(row as HTMLElement).classList.contains('today-board__row--done')) as HTMLElement;
    expect(notDoneRow.querySelector('.tag--next')).toBeFalsy();
  });

  it('does not collapse a lone (non-consecutive) complexity item — it renders as a normal row', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: 226, title: 'Re-ask A', technique: 'Complexity', startComfort: null,
        difficulty: null, done: false, kind: 'complexity' },
      { lcNumber: 39, title: 'Combination Sum', technique: 'Backtracking', startComfort: '🔴',
        difficulty: 'Medium', done: false },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.today-board__row--gate')).toBeFalsy();
    expect(fixture.nativeElement.querySelectorAll('.today-board__row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Re-ask A');
  });
});

// ── Trend panel: a small rising-bars icon button (beside ↗) opens an inline
// <app-problem-timeline> beneath the row; the title itself is plain text. ────────────────
describe('TodayBoardComponent — trend panel', () => {
  it("the title stays a plain span; the row's history button carries the Comfort-history tooltip/aria-label and toggles the panel (aria-expanded, .today-board__trend, one trend emit); clicking again collapses it with no further emit", () => {
    const fixture = createFixture(makeSchedule());
    const emitted: ScheduleItem[] = [];
    fixture.componentInstance.trend.subscribe((item) => emitted.push(item));

    const titles: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.today-board__title'));
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.every((t) => t.tagName === 'SPAN')).toBe(true);

    const btns: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.today-board__trend-btn'));
    const btn = btns[1]; // Same Tree, lcNumber 100
    expect(btn.getAttribute('title')).toBe('Comfort history');
    expect(btn.getAttribute('aria-label')).toBe('Comfort history for #100');
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.today-board__trend')).toBeTruthy();
    expect(emitted.length).toBe(1);

    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.today-board__trend')).toBeFalsy();
    expect(emitted.length).toBe(1); // collapsing never re-emits
  });

  it('shows "Loading history…" while details are null (idle/loading)', () => {
    const fixture = createFixture(makeSchedule(), undefined, undefined, null, 'loading', null);

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__trend-btn');
    btn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.today-board__trend')?.textContent).toContain('Loading history…');
  });

  it('shows the error text and a Retry button that re-emits trend when detailsStatus is error', () => {
    const fixture = createFixture(makeSchedule(), undefined, undefined, null, 'error', 'boom went the fetch');
    const emitted: ScheduleItem[] = [];
    fixture.componentInstance.trend.subscribe((item) => emitted.push(item));

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__trend-btn');
    btn.click();
    fixture.detectChanges();
    expect(emitted.length).toBe(1); // the open itself already emits once

    const panel = fixture.nativeElement.querySelector('.today-board__trend')!;
    expect(panel.textContent).toContain('boom went the fetch');
    const retry: HTMLButtonElement = panel.querySelector('button')!;
    retry.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(2);
  });

  it('mounts app-problem-timeline for a ready, matching lcNumber', () => {
    const problem = makeProblemProgress({ lcNumber: 100, title: 'Same Tree' });
    const fixture = createFixture(makeSchedule(), undefined, undefined, [problem], 'ready', null);

    const btns: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__trend-btn'),
    );
    const sameTreeBtn = btns.find((b) => b.getAttribute('aria-label') === 'Comfort history for #100')!;
    sameTreeBtn.click();
    fixture.detectChanges();

    const panel = sameTreeBtn.closest('.today-board__row')!.querySelector('.today-board__trend')!;
    expect(panel.querySelector('app-problem-timeline')).toBeTruthy();
  });

  it('shows a "comfort history · N reps" caption above the chart, using the matched problem\'s rep count', () => {
    const problem = makeProblemProgress({
      lcNumber: 100,
      title: 'Same Tree',
      repDates: ['2026-08-01', '2026-08-15', '2026-09-01'],
    });
    const fixture = createFixture(makeSchedule(), undefined, undefined, [problem], 'ready', null);

    const btns: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__trend-btn'),
    );
    const sameTreeBtn = btns.find((b) => b.getAttribute('aria-label') === 'Comfort history for #100')!;
    sameTreeBtn.click();
    fixture.detectChanges();

    const panel = sameTreeBtn.closest('.today-board__row')!.querySelector('.today-board__trend')!;
    expect(panel.querySelector('.today-board__hint')?.textContent).toBe('comfort history · 3 reps');
  });

  it('shows "No rep history yet" when details are ready but nothing matches the row\'s lcNumber', () => {
    const fixture = createFixture(makeSchedule(), undefined, undefined, [], 'ready', null);

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.today-board__trend-btn');
    btn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.today-board__trend')?.textContent).toContain('No rep history yet');
  });

  it("picks the ProblemProgress whose title matches the row when two entries share the same lcNumber (method variants)", () => {
    const schedule = makeSchedule();
    const item = schedule.days[0].items[1]; // Same Tree, lcNumber 100
    const variantA = makeProblemProgress({ lcNumber: 100, title: 'Same Tree (Recursive)' });
    const variantB = makeProblemProgress({ lcNumber: 100, title: item.title });

    const fixture = createFixture(schedule, undefined, undefined, [variantA, variantB], 'ready', null);

    expect(fixture.componentInstance.problemFor(item)).toBe(variantB);
  });

  it('opening a second row\'s trend panel closes the first (one open at a time)', () => {
    const fixture = createFixture(makeSchedule());
    const btns: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.today-board__trend-btn'),
    );
    expect(btns.length).toBe(2);

    btns[0].click();
    fixture.detectChanges();
    expect(btns[0].getAttribute('aria-expanded')).toBe('true');

    btns[1].click();
    fixture.detectChanges();
    expect(btns[0].getAttribute('aria-expanded')).toBe('false');
    expect(btns[1].getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.today-board__trend').length).toBe(1);
  });

  it('renders no history button for a gate row or a row with a null lcNumber', () => {
    const schedule = makeSchedule();
    schedule.days[0].items = [
      { lcNumber: null, title: 'No-number row', technique: null, startComfort: null,
        difficulty: null, done: false },
      { lcNumber: 226, title: 'Re-ask A', technique: 'Complexity', startComfort: null,
        difficulty: null, done: false, kind: 'complexity' },
      { lcNumber: 211, title: 'Re-ask B', technique: 'Complexity', startComfort: null,
        difficulty: null, done: false, kind: 'complexity' },
    ];

    const fixture = createFixture(schedule);

    expect(fixture.nativeElement.querySelector('.today-board__trend-btn')).toBeFalsy();
    const gateTitle = fixture.nativeElement.querySelector('.today-board__row--gate .today-board__title');
    expect(gateTitle.tagName).toBe('SPAN');
  });
});

// No `core/utils/local-date.spec.ts` file exists yet, so `shortMonthDay` is tested here
// alongside its one caller.
describe('shortMonthDay', () => {
  it('renders a two-digit day unchanged', () => {
    expect(shortMonthDay('2026-10-21')).toBe('Oct 21');
  });

  it('strips a leading zero from a single-digit day', () => {
    expect(shortMonthDay('2026-01-05')).toBe('Jan 5');
  });

  it('returns non-matching input unchanged (fail-visible, not silent)', () => {
    expect(shortMonthDay('not-a-date')).toBe('not-a-date');
    expect(shortMonthDay('')).toBe('');
  });
});

describe('endNoteMeaning', () => {
  it('maps s0 and prov to the same provisional-clean meaning', () => {
    expect(endNoteMeaning('s0')).toBe(endNoteMeaning('prov'));
    expect(endNoteMeaning('prov')).toContain('provisional clean');
  });

  it('maps s1 and s2 to distinct clean-streak meanings', () => {
    expect(endNoteMeaning('s1')).toContain('clean streak 1');
    expect(endNoteMeaning('s2')).toContain('clean streak 2');
    expect(endNoteMeaning('s1')).not.toBe(endNoteMeaning('s2'));
  });

  it('maps dropped to its own meaning', () => {
    expect(endNoteMeaning('dropped')).toContain('dropped from the tracker');
  });

  it('returns null for an unknown or empty note (fail-visible: shown raw by the template)', () => {
    expect(endNoteMeaning('s7')).toBeNull();
    expect(endNoteMeaning('')).toBeNull();
  });

  it('returns null for an inherited Object property name, never the prototype method itself', () => {
    // endNote is external input ("anything else the E cell carried") — a plain object also
    // answers to `toString`/`constructor`/`__proto__`, which a naive lookup would return.
    expect(endNoteMeaning('toString')).toBeNull();
    expect(endNoteMeaning('constructor')).toBeNull();
  });
});
