import { ScheduleDay, ScheduleItem, WorkloadDay } from '../../../core/models/progress.model';
import { WorkloadBand, workloadBand } from '../../../core/utils/workload-band';
import { buildWorkloadBar, countRows, isMissedItem, movedAriaLabel, statusIcon } from './board-rows';

const CEILING = 8;
const FLOOR = 4;
const TODAY = '2026-10-10';

function makeDay(date: string, units: number): ScheduleDay {
  return { date, weekday: 'Day', label: null, units, items: [] };
}

function makeWorkload(date: string, planned: number, done: number): WorkloadDay {
  return { date, planned, done, built: done, partial: false };
}

describe('buildWorkloadBar band', () => {
  const cases: { name: string; date: string; planned: number; done: number; expected: WorkloadBand }[] = [
    { name: 'past day bands on done (Over)', date: '2026-10-09', planned: 8, done: 9, expected: 'Over' },
    { name: 'future day bands on planned (Heavy)', date: '2026-10-11', planned: 8, done: 0, expected: 'Heavy' },
    {
      name: 'past day bands on done, not planned',
      date: '2026-10-09',
      planned: 6.6,
      done: 3.8,
      expected: workloadBand(3.8, CEILING, FLOOR),
    },
  ];

  cases.forEach(({ name, date, planned, done, expected }) => {
    it(name, () => {
      const bar = buildWorkloadBar(makeDay(date, planned), CEILING, FLOOR, [makeWorkload(date, planned, done)], TODAY);
      expect(bar?.band).toBe(expected);
    });
  });
});

describe('moved marker direction', () => {
  const DAY = '2026-10-10';
  const cases = [
    { name: 'earlier deferredTo moves up', deferredTo: '2026-10-09', label: 'Moved up to Fri Oct 9' },
    { name: 'later deferredTo moves on', deferredTo: '2026-10-11', label: 'Moved to Sun Oct 11' },
  ];

  cases.forEach(({ name, deferredTo, label }) => {
    it(name, () => {
      const item: ScheduleItem = {
        lcNumber: 1, title: 'A', technique: null, startComfort: null, difficulty: null,
        done: false, deferredTo,
      };
      expect(movedAriaLabel(item, DAY)).toBe(label);
    });
  });
});

describe('statusIcon', () => {
  const PAST = '2026-10-09';
  const cases = [
    { name: 'moved up, done', date: TODAY, done: true, deferredTo: PAST, expected: 'undo' },
    { name: 'moved up, not done', date: TODAY, done: false, deferredTo: PAST, expected: 'undo' },
    { name: 'moved later, not done', date: TODAY, done: false, deferredTo: '2026-10-11', expected: 'redo' },
    { name: 'missed: past day, not done, no deferredTo', date: PAST, done: false, deferredTo: undefined, expected: 'redo' },
    { name: 'today, not done, no deferredTo', date: TODAY, done: false, deferredTo: undefined, expected: 'circle' },
    { name: 'pulled in, done', date: TODAY, done: true, deferredTo: undefined, pulledIn: true, expected: 'undo' },
  ];

  cases.forEach(({ name, date, done, deferredTo, expected, ...rest }) => {
    it(name, () => {
      const item: ScheduleItem = {
        lcNumber: 1, title: 'A', technique: null, startComfort: null, difficulty: null,
        done, deferredTo, ...rest,
      };
      expect(statusIcon(item, 'circle', date, TODAY)).toBe(expected);
    });
  });
});

describe('countRows', () => {
  it('counts pulled-in rows as done but leaves them out of the total', () => {
    const plain: ScheduleItem = {
      lcNumber: 1, title: 'A', technique: null, startComfort: null, difficulty: null, done: true,
    };
    const rows = [plain, plain, plain, plain, { ...plain, pulledIn: true }, { ...plain, pulledIn: true }];
    expect(countRows(rows)).toEqual({ done: 6, total: 4, moved: 0 });
  });
});

describe('isMissedItem', () => {
  const PAST = '2026-10-09';
  const cases = [
    { name: 'past day, not done, no deferredTo', date: PAST, done: false, deferredTo: undefined, expected: true },
    { name: 'today, not done', date: TODAY, done: false, deferredTo: undefined, expected: false },
    { name: 'past day, done', date: PAST, done: true, deferredTo: undefined, expected: false },
    { name: 'past day, deferredTo set', date: PAST, done: false, deferredTo: '2026-10-11', expected: false },
  ];

  cases.forEach(({ name, date, done, deferredTo, expected }) => {
    it(name, () => {
      const item: ScheduleItem = {
        lcNumber: 1, title: 'A', technique: null, startComfort: null, difficulty: null,
        done, deferredTo,
      };
      expect(isMissedItem(item, date, TODAY)).toBe(expected);
    });
  });
});
