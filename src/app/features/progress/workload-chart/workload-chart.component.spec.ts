import { TestBed } from '@angular/core/testing';

import { WorkloadChartComponent, DAILY_WINDOW_DAYS } from './workload-chart.component';
import { WorkloadDay } from '../../../core/models/progress.model';
import { addDaysISO, weekStartISO } from '../../../core/utils/local-date';

// A day far enough in the past that it can never collide with "today" no matter when this
// spec runs (see local-date's own todayLocalISO-independence caution) — everything built off
// it stays a fixed distance from the real clock.
const BASE_DATE = '2020-01-01';
// Far enough in the future that no plausible run date ever catches up to it.
const FAR_FUTURE_DATE = '2099-01-05';

function makeDay(overrides: Partial<WorkloadDay> = {}): WorkloadDay {
  return { date: BASE_DATE, planned: 5, done: 4, built: 5, partial: false, ...overrides };
}

function createFixture(workload: WorkloadDay[], ceiling: number | null = null, floor: number | null = null) {
  TestBed.configureTestingModule({ imports: [WorkloadChartComponent] });
  const fixture = TestBed.createComponent(WorkloadChartComponent);
  fixture.componentRef.setInput('workload', workload);
  fixture.componentRef.setInput('ceiling', ceiling);
  fixture.componentRef.setInput('floor', floor);
  fixture.detectChanges();
  return fixture;
}

function clickWeeklyToggle(fixture: { nativeElement: HTMLElement; detectChanges: () => void }): void {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('.wlchart__toggle'),
  ) as HTMLButtonElement[];
  const weekly = buttons.find((b) => b.textContent?.trim() === 'Weekly')!;
  weekly.click();
  fixture.detectChanges();
}

describe('WorkloadChartComponent', () => {
  it('renders one bar per entry, capped to the last DAILY_WINDOW_DAYS days of entries', () => {
    const extraDays = 4;
    const workload = Array.from({ length: DAILY_WINDOW_DAYS + extraDays }, (_, i) =>
      makeDay({ date: addDaysISO(BASE_DATE, i) }),
    );
    const fixture = createFixture(workload);

    expect(fixture.nativeElement.querySelectorAll('.wlchart__bar').length).toBe(DAILY_WINDOW_DAYS);
  });

  it("bands a done bar's fill by workloadBand against the given ceiling/floor", () => {
    // ceiling 8, floor 3: 2 <= floor -> Light; 5 is between floor and 0.9*8=7.2 -> Moderate;
    // 7.5 >= 7.2 -> Heavy.
    const workload = [
      makeDay({ date: addDaysISO(BASE_DATE, 0), done: 2 }),
      makeDay({ date: addDaysISO(BASE_DATE, 1), done: 5 }),
      makeDay({ date: addDaysISO(BASE_DATE, 2), done: 7.5 }),
    ];
    const fixture = createFixture(workload, 8, 3);

    const bars = fixture.nativeElement.querySelectorAll('.wlchart__bar');
    expect(bars[0].querySelector('.wlchart__done')?.getAttribute('fill')).toBe('var(--color-easy)');
    expect(bars[1].querySelector('.wlchart__done')?.getAttribute('fill')).toBe('var(--color-medium)');
    expect(bars[2].querySelector('.wlchart__done')?.getAttribute('fill')).toBe('var(--color-hard)');
  });

  it('renders no done bar (planned outline only) for a day later than today', () => {
    const workload = [
      makeDay({ date: addDaysISO(BASE_DATE, 0), done: 4 }),
      makeDay({ date: FAR_FUTURE_DATE, planned: 6, done: 0 }),
    ];
    const fixture = createFixture(workload, 8, 3);

    const bars = fixture.nativeElement.querySelectorAll('.wlchart__bar');
    expect(bars[0].querySelector('.wlchart__done')).toBeTruthy();
    expect(bars[1].querySelector('.wlchart__done')).toBeFalsy();
    expect(bars[1].querySelector('.wlchart__planned')).toBeTruthy();
  });

  it('the weekly toggle groups 14 daily entries into 2 bars whose <title> sums are right', () => {
    // A Monday derived from weekStartISO itself (not a memorized calendar fact), so 14
    // consecutive days from it split into exactly 2 Mon-Sun ISO weeks.
    const monday = weekStartISO(BASE_DATE);
    const workload = Array.from({ length: 14 }, (_, i) =>
      makeDay({ date: addDaysISO(monday, i), planned: i + 1, done: 0.5 }),
    );
    // Week 1 (i=0..6): planned 1+2+...+7 = 28, done 0.5*7 = 3.5.
    // Week 2 (i=7..13): planned 8+9+...+14 = 77, done 0.5*7 = 3.5.
    const fixture = createFixture(workload);

    clickWeeklyToggle(fixture);

    const bars = fixture.nativeElement.querySelectorAll('.wlchart__bar');
    expect(bars.length).toBe(2);
    expect(bars[0].querySelector('title')?.textContent).toContain('planned 28');
    expect(bars[0].querySelector('title')?.textContent).toContain('done 3.5');
    expect(bars[1].querySelector('title')?.textContent).toContain('planned 77');
    expect(bars[1].querySelector('title')?.textContent).toContain('done 3.5');
  });

  it('keeps the daily view intrinsic width legible (under 1000 units) for a full 56-bar window', () => {
    const workload = Array.from({ length: DAILY_WINDOW_DAYS }, (_, i) =>
      makeDay({ date: addDaysISO(BASE_DATE, i) }),
    );
    const fixture = createFixture(workload);

    const svg = fixture.nativeElement.querySelector('svg')!;
    expect(Number(svg.getAttribute('width'))).toBeLessThan(1000);
    // The intrinsic width/height match the viewBox — 1 viewBox unit = 1 CSS px, so the
    // labels never get scaled down by a shrink-to-fit `width: 100%` SVG.
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${svg.getAttribute('width')} ${svg.getAttribute('height')}`);
  });

  it('shows the three band names (Light/Moderate/Heavy) in the legend when a ceiling is given', () => {
    const workload = [makeDay({ date: addDaysISO(BASE_DATE, 0) })];
    const fixture = createFixture(workload, 8, 3);

    const legendText = fixture.nativeElement.querySelector('.wlchart__legend')?.textContent ?? '';
    expect(legendText).toContain('Light');
    expect(legendText).toContain('Moderate');
    expect(legendText).toContain('Heavy');
    expect(legendText).not.toContain('no ceiling known');
  });

  it('shows the "no ceiling known" swatch instead, when no ceiling is given', () => {
    const workload = [makeDay({ date: addDaysISO(BASE_DATE, 0) })];
    const fixture = createFixture(workload); // ceiling defaults to null

    const legendText = fixture.nativeElement.querySelector('.wlchart__legend')?.textContent ?? '';
    expect(legendText).toContain('no ceiling known');
  });

  it('rounds a fractional weekly ceiling line to 1dp (8.1 * 7 -> "ceiling 56.7")', () => {
    const workload = [makeDay({ date: addDaysISO(BASE_DATE, 0) })];
    const fixture = createFixture(workload, 8.1, 3);

    clickWeeklyToggle(fixture);

    const label = fixture.nativeElement.querySelector('.wlchart__ceiling-label')?.textContent;
    expect(label).toBe('ceiling 56.7');
  });

  it('sets a summarizing aria-label on the svg (role="img")', () => {
    const workload = [makeDay({ date: addDaysISO(BASE_DATE, 0), planned: 6, done: 5 })];
    const fixture = createFixture(workload);

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    const label = svg?.getAttribute('aria-label');
    expect(label).toContain('Daily workload, last 1 days');
    expect(label).toContain('planned 6');
    expect(label).toContain('done 5');
  });

  it('renders the "Nothing to chart yet" hint and no chart for an empty input', () => {
    const fixture = createFixture([]);

    expect(fixture.nativeElement.querySelector('.wlchart-empty')?.textContent).toContain(
      'Nothing to chart yet',
    );
    expect(fixture.nativeElement.querySelector('svg')).toBeFalsy();
  });
});
