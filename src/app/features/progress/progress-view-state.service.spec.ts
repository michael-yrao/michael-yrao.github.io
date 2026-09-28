import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TodayBoardComponent } from './today-board/today-board.component';
import { WorkloadChartComponent } from './workload-chart/workload-chart.component';
import { Schedule, WorkloadDay } from '../../core/models/progress.model';
import { addDaysISO, currentWeekStart, todayLocalISO } from '../../core/utils/local-date';

const DAYS_PER_WEEK = 7;

// A full 7-day week with no items — enough to exercise week/day navigation without pulling in
// today-board.component.spec.ts's richer fixtures.
function makeWeekSchedule(weekOf: string): Schedule {
  return {
    weekOf,
    days: Array.from({ length: DAYS_PER_WEEK }, (_, i) => ({
      date: addDaysISO(weekOf, i),
      weekday: `Day${i}`,
      label: null,
      units: null,
      items: [],
    })),
  };
}

const WORKLOAD: WorkloadDay[] = [{ date: '2020-01-01', planned: 1, done: 1, built: 1, partial: false }];

// Each case drives one widget through a state-changing action, destroys that fixture, then
// creates a FRESH fixture in the same TestBed (no resetTestingModule in between — that's the
// whole point: it's the shared root-provided ProgressViewStateService, not a fresh module,
// that must carry the state across the widget's destroy/recreate a tab switch causes).
const cases: ReadonlyArray<[string, () => void]> = [
  [
    'today-board: week/day/expanded picks all carry over',
    () => {
      TestBed.configureTestingModule({ imports: [TodayBoardComponent], providers: [provideRouter([])] });
      const currentWeekOf = currentWeekStart(todayLocalISO());
      const targetWeekOf = addDaysISO(currentWeekOf, -DAYS_PER_WEEK);
      const pickedDate = addDaysISO(targetWeekOf, 2);

      const first = TestBed.createComponent(TodayBoardComponent);
      first.componentRef.setInput('schedule', makeWeekSchedule(currentWeekOf));
      first.detectChanges();

      first.componentInstance.prevWeek();
      first.componentInstance.selectDay(pickedDate);
      first.componentInstance.toggleExpanded();
      first.detectChanges();
      first.destroy();

      const second = TestBed.createComponent(TodayBoardComponent);
      second.componentRef.setInput('schedule', makeWeekSchedule(currentWeekOf));
      second.detectChanges();

      expect(second.componentInstance.displayedWeekOf()).toBe(targetWeekOf);
      expect(second.componentInstance.effectiveDate()).toBe(pickedDate);
      expect(second.componentInstance.expanded()).toBe(true);
    },
  ],
  [
    'workload-chart: the daily/weekly view pick carries over',
    () => {
      TestBed.configureTestingModule({ imports: [WorkloadChartComponent] });

      const first = TestBed.createComponent(WorkloadChartComponent);
      first.componentRef.setInput('workload', WORKLOAD);
      first.detectChanges();

      first.componentInstance.setView('weekly');
      first.detectChanges();
      first.destroy();

      const second = TestBed.createComponent(WorkloadChartComponent);
      second.componentRef.setInput('workload', WORKLOAD);
      second.detectChanges();

      expect(second.componentInstance.view()).toBe('weekly');
    },
  ],
];

describe('ProgressViewStateService', () => {
  it('survives a widget being destroyed and recreated (a tab switch\'s @if-gated destroy/recreate)', () => {
    for (const [, act] of cases) {
      // Case isolation only — resets before each case, never between a case's own two
      // fixtures (see the cases' own comment above).
      TestBed.resetTestingModule();
      act();
    }
  });
});
