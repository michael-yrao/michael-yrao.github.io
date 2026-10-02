import { Route, UrlSegment, UrlSegmentGroup } from '@angular/router';

import { practicePageMatcher } from './practice-route';

function match(path: string) {
  const segments = path.split('/').map((part) => new UrlSegment(part, {}));
  return practicePageMatcher(segments, {} as UrlSegmentGroup, {} as Route);
}

describe('practicePageMatcher', () => {
  const cases: ReadonlyArray<{
    path: string;
    number: string | null;
    tab: string | null;
  }> = [
    { path: 'practice/22', number: '22', tab: null },
    { path: 'practice/22/solution', number: '22', tab: 'solution' },
    { path: 'practice/22/bogus', number: null, tab: null },
    { path: 'practice', number: null, tab: null },
    { path: 'practice/22/solution/x', number: null, tab: null },
  ];

  it.each(cases)('$path -> number $number, tab $tab', ({ path, number, tab }) => {
    const result = match(path);

    expect(result?.posParams?.['number']?.path ?? null).toBe(number);
    expect(result?.posParams?.['tab']?.path ?? null).toBe(tab);
    expect(result === null).toBe(number === null);
  });
});
