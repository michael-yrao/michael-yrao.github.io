import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { GOLD_STANDARD_REPO, LoadStatus } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { SolutionPageComponent } from './solution-page.component';

const CONTRACT_ONLY_PROBLEM: PracticeProblem = {
  number: 90,
  title: 'Subsets II',
  url: 'https://leetcode.com/problems/subsets-ii/',
  statement: 'Return all subsets.',
  stub: 'class Solution:\n    pass\n',
  entry: { className: 'Solution', method: 'subsetsWithDup' },
  compare: 'unordered-nested',
  cases: [{ args: [[1, 2]], expected: [[1], [2]], example: true }],
};

/** Settles the page after the algorithm's chunk has loaded (the walkthrough needs the meta). */
async function setUp(number: string, problems: readonly PracticeProblem[]) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems };
  const params = convertToParamMap({ number });
  const query = convertToParamMap({});
  TestBed.configureTestingModule({
    imports: [SolutionPageComponent],
    providers: [
      provideRouter([]),
      {
        provide: PracticeService,
        useValue: {
          status: signal<LoadStatus>('ready'),
          error: signal<string | null>(null),
          data: signal<PracticeData | null>(data),
          ref: signal(GOLD_STANDARD_REPO),
          load: vi.fn(),
          problemFor: (n: number) => problems.find((p) => p.number === n) ?? null,
        },
      },
      {
        provide: ShowcaseService,
        useValue: {
          status: signal<LoadStatus>('loading'),
          error: signal<string | null>(null),
          data: signal(null),
          load: vi.fn(),
          entryFor: () => null,
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(params),
          queryParamMap: of(query),
          snapshot: { paramMap: params, queryParamMap: query },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SolutionPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function has(root: HTMLElement, selector: string): boolean {
  return root.querySelector(selector) !== null;
}

describe('SolutionPageComponent', () => {
  const PAGES: readonly {
    readonly name: string;
    readonly number: string;
    readonly problems: readonly PracticeProblem[];
    readonly hasWalkthrough: boolean;
  }[] = [
    { name: 'a static-only problem', number: '1', problems: [], hasWalkthrough: true },
    { name: 'a contract-only problem', number: '90', problems: [CONTRACT_ONLY_PROBLEM], hasWalkthrough: false },
  ];

  it.each(PAGES)(
    '$name shows its description, and the variant bar and visualizer only when it has a walkthrough; never an editor',
    async ({ number, problems, hasWalkthrough }) => {
      const root: HTMLElement = (await setUp(number, problems)).nativeElement;

      expect(has(root, 'app-practice-description')).toBe(true);
      expect(has(root, 'app-variant-bar')).toBe(hasWalkthrough);
      expect(has(root, 'app-step-visualizer')).toBe(hasWalkthrough);
      expect(has(root, 'app-solution-code')).toBe(false);
      expect(has(root, 'app-code-editor')).toBe(false);

      if (hasWalkthrough) {
        const hrefs = Array.from(root.querySelectorAll('.neighbor-btn')).map((a) => a.getAttribute('href'));
        expect(hrefs.length).toBeGreaterThan(0);
        expect(hrefs.every((href) => href?.endsWith('/solution'))).toBe(true);
      }
    },
  );

  it('pressing Code shows the code panel beside the visualizer, and pressing Visualizer hides it', async () => {
    const fixture = await setUp('1', []);
    const root: HTMLElement = fixture.nativeElement;
    const press = (label: string): void => {
      Array.from(root.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === label)!
        .click();
      fixture.detectChanges();
    };

    press('Code');
    expect([has(root, 'app-step-visualizer'), has(root, 'app-solution-code')]).toEqual([true, true]);

    press('Visualizer');
    expect([has(root, 'app-step-visualizer'), has(root, 'app-solution-code')]).toEqual([false, true]);
  });
});
