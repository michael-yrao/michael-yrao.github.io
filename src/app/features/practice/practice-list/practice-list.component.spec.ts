import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { GOLD_STANDARD_REPO, LoadStatus } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { PracticeListComponent } from './practice-list.component';

const RUN_MARK = '>_';
const VISUALIZED_MARK = '⬡';
const CONTRACT_ONLY_NUMBER = 9001;
const STATIC_AND_CONTRACT_NUMBER = 20;
const STATIC_ONLY_NUMBER = 1;

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
  return fixture;
}

function rows(root: HTMLElement): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a.practice-list__row'));
}

function rowNumber(row: HTMLAnchorElement): number {
  return Number(row.querySelector('.practice-list__num')?.textContent?.replace('#', ''));
}

function rowFor(root: HTMLElement, number: number): HTMLAnchorElement {
  const row = rows(root).find((r) => rowNumber(r) === number);
  if (!row) throw new Error(`no row #${number}`);
  return row;
}

function text(element: Element): string {
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('PracticeListComponent', () => {
  it('lists static and contract problems ascending, marking the runnable and visualized ones', () => {
    const root = setUp('ready', null, [
      problem(CONTRACT_ONLY_NUMBER, 'Custom Problem'),
      problem(STATIC_AND_CONTRACT_NUMBER, 'Valid Parentheses'),
    ]).nativeElement as HTMLElement;

    const numbers = rows(root).map(rowNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(numbers.at(-1)).toBe(CONTRACT_ONLY_NUMBER);

    const both = rowFor(root, STATIC_AND_CONTRACT_NUMBER);
    expect(both.getAttribute('href')).toBe('/practice/20');
    expect(text(both)).toContain(RUN_MARK);
    expect(text(both)).toContain(VISUALIZED_MARK);
    expect(both.querySelector('.difficulty-badge')).not.toBeNull();

    const contractOnly = rowFor(root, CONTRACT_ONLY_NUMBER);
    expect(text(contractOnly)).toContain(RUN_MARK);
    expect(contractOnly.querySelector('.difficulty-badge')).toBeNull();

    expect(text(rowFor(root, STATIC_ONLY_NUMBER))).not.toContain(RUN_MARK);
  });

  it('shows category and tags only after Tags is pressed', () => {
    const fixture = setUp('ready', null, []);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.practice-list__cat')).toBeNull();
    expect(root.querySelector('.practice-list__tag')).toBeNull();

    const tagsButton = Array.from(root.querySelectorAll('button')).find(
      (b) => text(b) === 'Tags',
    ) as HTMLButtonElement;
    tagsButton.click();
    fixture.detectChanges();

    expect(root.querySelector('.practice-list__cat')).not.toBeNull();
    expect(root.querySelector('.practice-list__tag')).not.toBeNull();
  });

  it('still lists the static rows, plus the message, when the contract failed', () => {
    const root = setUp('error', 'The practice contract is invalid.', []).nativeElement as HTMLElement;

    expect(root.querySelector('.practice-list__message')?.textContent?.trim()).toBe(
      'The practice contract is invalid.',
    );
    expect(rows(root).length).toBeGreaterThan(0);
    expect(rows(root).some((r) => text(r).includes(RUN_MARK))).toBe(false);
  });
});
