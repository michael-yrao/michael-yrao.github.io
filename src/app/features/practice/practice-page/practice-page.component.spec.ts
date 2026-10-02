import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import { GOLD_STANDARD_REPO, LoadStatus } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { PracticePageComponent } from './practice-page.component';

const STUB = 'class Solution:\n    pass\n';
const DRAFT_KEY = 'po-practice-draft:michael-yrao/cse-progress:90';
const SPLIT_KEY = 'po-practice-split';

const PROBLEM: PracticeProblem = {
  number: 90,
  title: 'Subsets II',
  url: 'https://leetcode.com/problems/subsets-ii/',
  statement: 'Return all subsets.',
  stub: STUB,
  entry: { className: 'Solution', method: 'subsetsWithDup' },
  compare: 'unordered-nested',
  cases: [
    { args: [[1, 2]], expected: [[1], [2]], example: true },
    { args: [[3]], expected: [[3]], example: false },
  ],
};

const RUN_STATE: RunState = {
  status: 'done',
  runError: null,
  results: [
    {
      index: 0,
      verdict: 'pass',
      outcome: { status: 'ok', hasJson: true, gotJson: [[1], [2]], gotRepr: '[[1], [2]]', stdout: 'hello' },
    },
    {
      index: 1,
      verdict: 'fail',
      outcome: { status: 'ok', hasJson: true, gotJson: [[4]], gotRepr: '[[4]]', stdout: '' },
    },
  ],
};

const setTextSpy = vi.fn();

@Component({ selector: 'app-code-editor', template: '' })
class StubEditorComponent {
  readonly initialText = input.required<string>();
  readonly textChange = output<string>();
  setText(text: string): void {
    setTextSpy(text);
  }
}

function makePracticeStub(
  problems: readonly PracticeProblem[],
  status: LoadStatus = 'ready',
  error: string | null = null,
) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems };
  return {
    status: signal<LoadStatus>(status),
    error: signal<string | null>(error),
    data: signal<PracticeData | null>(data),
    ref: signal(GOLD_STANDARD_REPO),
    load: vi.fn(),
    problemFor: (n: number) => problems.find((p) => p.number === n) ?? null,
  };
}

function setUp(
  number: string,
  problems: readonly PracticeProblem[],
  status: LoadStatus = 'ready',
  error: string | null = null,
) {
  const params = convertToParamMap({ number });
  const query = convertToParamMap({});
  TestBed.configureTestingModule({
    imports: [PracticePageComponent],
    providers: [
      provideRouter([]),
      { provide: PracticeService, useValue: makePracticeStub(problems, status, error) },
      { provide: ShowcaseService, useValue: { data: signal(null), load: vi.fn(), entryFor: () => null } },
      { provide: PythonRunnerService, useValue: { run: () => of(RUN_STATE) } },
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
  TestBed.overrideComponent(PracticePageComponent, {
    remove: { imports: [CodeEditorComponent] },
    add: { imports: [StubEditorComponent] },
  });
  const fixture = TestBed.createComponent(PracticePageComponent);
  fixture.detectChanges();
  return fixture;
}

function click(root: HTMLElement, label: string): void {
  const button = Array.from(root.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );
  button!.click();
}

describe('PracticePageComponent', () => {
  beforeEach(() => {
    setTextSpy.mockClear();
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(SPLIT_KEY);
  });
  afterEach(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(SPLIT_KEY);
  });

  it('draws every case as an expandable row: a pass shows Input / Expected / Got / stdout, a fail Input / Expected / Got', () => {
    const fixture = setUp('90', [PROBLEM]);
    const root: HTMLElement = fixture.nativeElement;

    click(root, 'Run');
    fixture.detectChanges();

    const rows = Array.from(root.querySelectorAll('.practice__row'));
    expect(rows.map((row) => row.querySelector('.practice__mark')?.textContent?.trim())).toEqual([
      '✓',
      '✗',
    ]);
    const labelsOf = (row: Element) =>
      Array.from(row.querySelectorAll('.practice__label')).map((l) => l.textContent?.trim());
    expect(rows.every((row) => row.querySelector('details') !== null)).toBe(true);
    expect(labelsOf(rows[0])).toEqual(['Input', 'Expected', 'Got', 'stdout']);
    expect(rows[0].querySelector('.practice__detail pre:last-of-type')?.textContent).toBe('hello');
    expect(labelsOf(rows[1])).toEqual(['Input', 'Expected', 'Got']);
    expect(root.querySelector('.practice__summary')?.textContent?.trim()).toBe('1 / 2');
  });

  const PANES: readonly {
    readonly name: string;
    readonly number: string;
    readonly problems: readonly PracticeProblem[];
    readonly hasSolutionTab: boolean;
    readonly hasEditor: boolean;
  }[] = [
    { name: 'a contract-only problem', number: '90', problems: [PROBLEM], hasSolutionTab: false, hasEditor: true },
    { name: 'a static-only problem', number: '1', problems: [], hasSolutionTab: true, hasEditor: false },
    {
      name: 'a problem in both sources',
      number: '20',
      problems: [{ ...PROBLEM, number: 20, title: 'Valid Parentheses' }],
      hasSolutionTab: true,
      hasEditor: true,
    },
  ];

  it.each(PANES)(
    '$name has the Solution tab and editor pane it should, and no tag or complexity',
    ({ number, problems, hasSolutionTab, hasEditor }) => {
      const root: HTMLElement = setUp(number, problems).nativeElement;

      const solutionTab = Array.from(root.querySelectorAll('a.practice-header__tab')).find(
        (a) => a.textContent?.trim() === 'Solution',
      );
      expect(solutionTab !== undefined).toBe(hasSolutionTab);
      if (solutionTab) expect(solutionTab.getAttribute('href')).toBe('/practice/' + number + '/solution');
      expect(root.querySelector('app-code-editor') !== null).toBe(hasEditor);
      expect(root.querySelector('.practice__divider') !== null).toBe(hasEditor);
      expect(root.querySelector('.meta-tag')).toBeNull();
      expect(root.querySelector('.complexity')).toBeNull();
    },
  );

  it('shows the not-found state and no editor for a number absent from the contract', () => {
    const fixture = setUp('91', [PROBLEM]);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.practice__message')?.textContent?.trim()).toBe(
      'No practice cases for #91 in michael-yrao/cse-progress.',
    );
    expect(root.querySelector('app-code-editor')).toBeNull();
  });

  it('shows the contract error above a static-only problem and still draws the page', () => {
    const root: HTMLElement = setUp('1', [], 'error', 'Contract load failed').nativeElement;

    expect(root.querySelector('.practice__message')?.textContent?.trim()).toBe('Contract load failed');
    expect(root.querySelector('.practice-header__tab')).not.toBeNull();
  });

  it('Reset restores the stub in the editor and clears the stored draft', () => {
    localStorage.setItem(DRAFT_KEY, 'my draft');
    const fixture = setUp('90', [PROBLEM]);

    click(fixture.nativeElement, 'Reset');

    expect(setTextSpy).toHaveBeenCalledWith(STUB);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('ArrowRight on the divider widens the problem pane by one step and stores it; a double-click resets to 50', () => {
    const fixture = setUp('90', [PROBLEM]);
    const divider: HTMLElement = fixture.nativeElement.querySelector('.practice__divider');

    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(divider.getAttribute('aria-valuenow')).toBe('52');
    expect(localStorage.getItem(SPLIT_KEY)).toBe('0.52');

    divider.dispatchEvent(new MouseEvent('dblclick'));
    fixture.detectChanges();

    expect(divider.getAttribute('aria-valuenow')).toBe('50');
    expect(localStorage.getItem(SPLIT_KEY)).toBe('0.5');
  });
});
