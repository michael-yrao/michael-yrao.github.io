import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { GOLD_STANDARD_REPO, LoadStatus } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { PracticeListComponent } from './practice-list.component';

function problem(number: number, title: string): PracticeProblem {
  return {
    number,
    title,
    url: null,
    statement: '',
    stub: '',
    entry: { className: 'Solution', method: 'solve' },
    compare: 'exact',
    cases: [],
  };
}

function setUp(status: LoadStatus, error: string | null, problems: readonly PracticeProblem[]) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems };
  const query = convertToParamMap({});
  TestBed.configureTestingModule({
    imports: [PracticeListComponent],
    providers: [
      provideRouter([]),
      {
        provide: PracticeService,
        useValue: {
          status: signal(status),
          error: signal(error),
          data: signal<PracticeData | null>(status === 'ready' ? data : null),
          ref: signal(GOLD_STANDARD_REPO),
          load: vi.fn(),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(query), snapshot: { queryParamMap: query } },
      },
    ],
  });
  const fixture = TestBed.createComponent(PracticeListComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PracticeListComponent', () => {
  it('lists problems ascending as "#<number> <title>" links, and shows only the error when the contract failed', () => {
    const root = setUp('ready', null, [problem(90, 'Subsets II'), problem(22, 'Generate Parentheses')]);

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.practice-list__row'));
    expect(links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '#22 Generate Parentheses',
      '#90 Subsets II',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/practice/22', '/practice/90']);

    TestBed.resetTestingModule();
    const failed = setUp('error', 'The practice contract is invalid.', []);

    expect(failed.querySelector('.practice-list__message')?.textContent?.trim()).toBe(
      'The practice contract is invalid.',
    );
    expect(failed.querySelectorAll('a.practice-list__row').length).toBe(0);
  });
});
