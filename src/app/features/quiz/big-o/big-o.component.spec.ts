import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { BigOComponent } from './big-o.component';
import { BigOService } from '../../../core/services/big-o.service';
import { BigOEntry, BigOData } from '../../../core/models/big-o.model';
import { Difficulty } from '../../../core/models/algorithm.model';
import { LoadStatus } from '../../../core/services/github-file.service';
import { BIG_O_FILTER_STORAGE_KEY, RUN_CAP } from './big-o-deck';

function makeEntry(overrides: Partial<BigOEntry> = {}): BigOEntry {
  return {
    key: '1:two-sum',
    lcNumber: 1,
    variant: 'two-sum',
    title: 'Two Sum',
    url: null,
    file: 'dsa/leetcode/arrays_and_hash/1_two_sum.py',
    symbol: 'twoSum',
    attemptDate: '2026-01-01',
    difficulty: 'Easy',
    category: 'arrays_and_hash',
    isMiss: false,
    note: null,
    time: 'O(n)',
    space: 'O(n)',
    whyTime: 'One pass.',
    whySpace: 'The hash map holds up to n entries.',
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    segments: [
      {
        kind: 'attempt',
        symbol: 'twoSum',
        startLine: 1,
        endLine: 2,
        lines: ['def two_sum(nums, target):', '    return []'],
      },
    ],
    ...overrides,
  };
}

function makePool(count: number, difficulties: readonly Difficulty[] = ['Easy', 'Medium', 'Hard']): BigOEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({
      key: `${i}:v`,
      lcNumber: 100 + i,
      difficulty: difficulties[i % difficulties.length],
      isMiss: i % 3 === 0,
    }),
  );
}

function makeData(entries: BigOEntry[]): BigOData {
  return { schemaVersion: 1, generatedAt: '2026-09-24', entries };
}

function makeBigOServiceStub(data: BigOData | null, status: LoadStatus = 'ready') {
  return {
    status: signal<LoadStatus>(status),
    error: signal<string | null>(null),
    data: signal<BigOData | null>(data),
    load: vi.fn(),
  };
}

function createFixture(stub: ReturnType<typeof makeBigOServiceStub>): ComponentFixture<BigOComponent> {
  TestBed.configureTestingModule({
    imports: [BigOComponent],
    providers: [provideRouter([]), { provide: BigOService, useValue: stub }],
  });
  const fixture = TestBed.createComponent(BigOComponent);
  fixture.detectChanges();
  return fixture;
}

describe('BigOComponent', () => {
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore — not every test environment exposes localStorage
    }
  });

  it('shows a loading state while the contract is in flight', () => {
    const stub = makeBigOServiceStub(null, 'loading');
    const fixture = createFixture(stub);

    expect(fixture.nativeElement.querySelector('.bo-state')?.textContent).toContain(
      'Loading your solutions',
    );
  });

  it('shows the error message with a Retry button that calls load(true)', () => {
    const stub = makeBigOServiceStub(null, 'error');
    stub.error.set('Could not load Big-O trainer (HTTP 500).');
    const fixture = createFixture(stub);

    const errorBlock = fixture.nativeElement.querySelector('.bo-state--error');
    expect(errorBlock.textContent).toContain('Could not load Big-O trainer');

    const retryBtn: HTMLButtonElement = errorBlock.querySelector('button');
    retryBtn.click();

    expect(stub.load).toHaveBeenCalledWith(true);
  });

  it('deals at most RUN_CAP questions and shows the matching-count caption', () => {
    const pool = makePool(30);
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);

    expect(fixture.componentInstance.deck().length).toBe(RUN_CAP);
    const caption = fixture.nativeElement.querySelector('.bo-filters__caption').textContent;
    expect(caption).toContain('30 problems match');
    expect(caption).toContain(`dealing ${RUN_CAP} per run`);
  });

  it('the Hard difficulty chip narrows the pool to Hard-only entries', () => {
    const pool = makePool(9); // 3 Easy, 3 Medium, 3 Hard
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);

    const hardChip: HTMLButtonElement = Array.from(
      fixture.nativeElement.querySelectorAll('.bo-filters__group .bo-chip'),
    ).find((el) => (el as HTMLButtonElement).textContent?.trim() === 'Hard') as HTMLButtonElement;
    hardChip.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pool().every((e) => e.difficulty === 'Hard')).toBe(true);
    expect(fixture.componentInstance.pool().length).toBe(3);
  });

  it('the misses-only toggle narrows the pool to isMiss entries', () => {
    const pool = makePool(9); // isMiss on every 3rd entry (indices 0, 3, 6)
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.bo-chip--toggle');
    toggle.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pool().every((e) => e.isMiss)).toBe(true);
    expect(fixture.componentInstance.pool().length).toBe(3);
  });

  it('shows the empty-deck state when a filter combination matches nothing, and "Show all" resets it', () => {
    const pool = [makeEntry({ key: 'only', difficulty: 'Easy', isMiss: false })];
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);

    fixture.componentInstance.setDifficulty('Hard');
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.bo-state--empty');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No problems match this filter');

    const showAllBtn: HTMLButtonElement = emptyState.querySelector('button');
    showAllBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bo-state--empty')).toBeFalsy();
    expect(fixture.componentInstance.filter().difficulty).toBe('All');
  });

  it('scores by exact string equality against the correct time/space labels', () => {
    const pool = [makeEntry({ key: 'only', time: 'O(n)', space: 'O(1)' })];
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);
    const component = fixture.componentInstance;

    component.pickTime('O(n)');
    component.pickSpace('O(1)');
    component.check();

    expect(component.timeCorrect()).toBe(true);
    expect(component.spaceCorrect()).toBe(true);
    expect(component.timeScore()).toBe(1);
    expect(component.spaceScore()).toBe(1);
  });

  it('reaches the finished state after advancing past the last question', () => {
    const pool = makePool(2);
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);
    const component = fixture.componentInstance;

    for (const _ of component.deck()) {
      const q = component.current()!;
      component.pickTime(q.time);
      component.pickSpace(q.space);
      component.check();
      component.next();
    }

    expect(component.mode()).toBe('finished');
    expect(component.totalScore()).toBe(component.maxScore());
  });

  it('persists the filter across a reload (a fresh component reads it back from localStorage)', () => {
    const pool = makePool(6);
    const stub = makeBigOServiceStub(makeData(pool));
    const fixture = createFixture(stub);

    fixture.componentInstance.setDifficulty('Medium');
    expect(localStorage.getItem(BIG_O_FILTER_STORAGE_KEY)).toContain('Medium');

    TestBed.resetTestingModule();
    const reloadedStub = makeBigOServiceStub(makeData(pool));
    const reloaded = createFixture(reloadedStub);

    expect(reloaded.componentInstance.filter().difficulty).toBe('Medium');
  });
});
