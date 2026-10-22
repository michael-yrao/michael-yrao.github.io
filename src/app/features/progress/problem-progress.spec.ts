import { ProblemProgress } from '../../core/models/progress.model';
import { ComfortFilter, attentionProblems, dueLabel, hasComfort, isDueOrOverdue } from './problem-progress';

const TODAY = '2026-10-21';

function problem(lcNumber: number, nextReview?: string, comfort = '🟢'): ProblemProgress {
  return { lcNumber, title: `P${lcNumber}`, comfort, nextReview } as ProblemProgress;
}

describe('hasComfort', () => {
  const cases: [string, ComfortFilter, boolean][] = [
    ['all passes everything', 'all', true],
    ['matching comfort passes', '🟢', true],
    ['mismatching comfort fails', '🔴', false],
  ];

  it.each(cases)('%s', (_label, filter, expected) => {
    expect(hasComfort(problem(1), filter)).toBe(expected);
  });
});

describe('isDueOrOverdue', () => {
  const cases: [string, string | undefined, boolean][] = [
    ['no nextReview is never due', undefined, false],
    ['today is due', TODAY, true],
    ['future is not due', '2026-10-22', false],
    ['past is overdue', '2026-10-20', true],
  ];

  it.each(cases)('%s', (_label, nextReview, expected) => {
    expect(isDueOrOverdue(problem(1, nextReview), TODAY)).toBe(expected);
  });
});

describe('dueLabel', () => {
  const cases: [string, string, string][] = [
    ['today', TODAY, 'due today'],
    ['3 days past', '2026-10-18', '3d overdue'],
  ];

  it.each(cases)('%s', (_label, nextReview, expected) => {
    expect(dueLabel(problem(1, nextReview), TODAY)).toBe(expected);
  });
});

describe('attentionProblems', () => {
  it('keeps only due or overdue rows, oldest nextReview first', () => {
    const list = [
      problem(1, '2026-10-25'),
      problem(2),
      problem(3, TODAY),
      problem(4, '2026-10-19'),
      problem(5, '2026-10-15'),
    ];
    expect(attentionProblems(list, TODAY).map((p) => p.lcNumber)).toEqual([5, 4, 3]);
  });
});
