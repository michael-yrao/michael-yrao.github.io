import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { ShowcaseEntry } from '../../../core/models/showcase.model';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { WalkthroughStateService } from '../walkthrough-state.service';
import { VariantBarComponent } from './variant-bar.component';

const META = {
  id: 'two-variants',
  lcNumber: 1,
  solutions: [
    { label: 'Brute force', variant: 'brute', generateSteps: () => [] },
    { label: 'Hash map', variant: 'hash', generateSteps: () => [] },
  ],
} as unknown as AlgorithmMeta;

type Bounds = Pick<ShowcaseEntry, 'time' | 'space' | 'timeQualifier' | 'spaceQualifier'>;

function render(entries: Record<string, Bounds>) {
  TestBed.configureTestingModule({
    providers: [
      WalkthroughStateService,
      {
        provide: ShowcaseService,
        useValue: { entryFor: (key: string | null) => (key ? (entries[key] ?? null) : null) },
      },
    ],
  });
  TestBed.inject(WalkthroughStateService).connect(signal(META));
  const fixture = TestBed.createComponent(VariantBarComponent);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  const bounds = () =>
    Array.from(root.querySelectorAll('.complexity')).map(
      (span) => `${span.querySelector('app-icon svg')?.getAttribute('data-name')} ${span.textContent?.trim()}`,
    );
  return { fixture, root, bounds };
}

const CASES: readonly { name: string; entry: Bounds | null; expected: string[] }[] = [
  {
    name: 'both labels shown',
    entry: { time: 'O(n^2)', space: 'O(1)', timeQualifier: null, spaceQualifier: null },
    expected: ['clock O(n^2)', 'memory O(1)'],
  },
  {
    name: 'a qualifier is appended',
    entry: { time: 'O(1)', space: 'O(n)', timeQualifier: 'amortized per operation', spaceQualifier: null },
    expected: ['clock O(1) amortized per operation', 'memory O(n)'],
  },
  { name: 'the entry is missing, so no spans', entry: null, expected: [] },
  {
    name: 'one label null, so only the other span',
    entry: { time: null, space: 'O(n)', timeQualifier: null, spaceQualifier: null },
    expected: ['memory O(n)'],
  },
];

describe('VariantBarComponent', () => {
  it.each(CASES)('$name', ({ entry, expected }) => {
    const { bounds } = render(entry ? { '1:brute': entry } : {});

    expect(bounds()).toEqual(expected);
  });

  it("shows the selected variant's own bound and changes it when another chip is pressed", () => {
    const { fixture, root, bounds } = render({
      '1:brute': { time: 'O(n^2)', space: 'O(1)', timeQualifier: null, spaceQualifier: null },
      '1:hash': { time: 'O(n)', space: 'O(n)', timeQualifier: null, spaceQualifier: null },
    });

    expect(bounds()).toEqual(['clock O(n^2)', 'memory O(1)']);

    root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    fixture.detectChanges();

    expect(bounds()).toEqual(['clock O(n)', 'memory O(n)']);
  });
});
