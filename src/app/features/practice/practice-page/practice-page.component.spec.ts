import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import { GOLD_STANDARD_REPO, LoadStatus } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { PracticePageComponent } from './practice-page.component';

const STUB = 'class Solution:\n    pass\n';
const DRAFT_KEY = 'po-practice-draft:michael-yrao/cse-progress:90';

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

function makePracticeStub(problems: readonly PracticeProblem[]) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems };
  return {
    status: signal<LoadStatus>('ready'),
    error: signal<string | null>(null),
    data: signal<PracticeData | null>(data),
    ref: signal(GOLD_STANDARD_REPO),
    load: vi.fn(),
    problemFor: (n: number) => problems.find((p) => p.number === n) ?? null,
  };
}

function setUp(number: string, problems: readonly PracticeProblem[]) {
  const params = convertToParamMap({ number });
  const query = convertToParamMap({});
  TestBed.configureTestingModule({
    imports: [PracticePageComponent],
    providers: [
      { provide: PracticeService, useValue: makePracticeStub(problems) },
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
  });
  afterEach(() => localStorage.removeItem(DRAFT_KEY));

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

  it('draws each example diagram under its own example text, without a caption', () => {
    const statement =
      'Find the tree.\n\nExample 1:\n    Input: n = 2\n\nExample 2:\n    Input: n = 3\n\nConstraints:\n    n >= 1';
    const problem: PracticeProblem = {
      ...PROBLEM,
      statement,
      figure: { kind: 'graph', directed: false, edgesArg: 1, nodeCountArg: 0 },
      cases: [
        { args: [2, [[0, 1]]], expected: 1, example: true },
        { args: [3, [[0, 1], [1, 2]]], expected: 2, example: true },
      ],
    };
    const root: HTMLElement = setUp('90', [problem]).nativeElement;

    const card = root.querySelector('.practice__statement')!;
    const order = Array.from(card.children).map((child) =>
      child.tagName === 'FIGURE' ? 'figure' : child.textContent?.trim().split('\n')[0],
    );
    expect(order).toEqual([
      'Find the tree.',
      'Example 1:',
      'figure',
      '',
      'Example 2:',
      'figure',
      'Constraints:',
    ]);
    expect(card.querySelectorAll('app-graph-visualizer').length).toBe(2);
    expect(root.querySelector('.practice__figure-caption')).toBeNull();
  });

  it('draws a backtick-marked span as inline code with the backticks gone', () => {
    const problem: PracticeProblem = { ...PROBLEM, statement: 'Given `nums`, return subsets.' };
    const root: HTMLElement = setUp('90', [problem]).nativeElement;

    expect(root.querySelector('code.practice__code')?.textContent).toBe('nums');
    expect(root.querySelector('.practice__statement')?.textContent).not.toContain('`');
  });

  it('shows the not-found state and no editor for a number absent from the contract', () => {
    const fixture = setUp('91', [PROBLEM]);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.practice__message')?.textContent?.trim()).toBe(
      'No practice cases for #91 in michael-yrao/cse-progress.',
    );
    expect(root.querySelector('app-code-editor')).toBeNull();
  });

  it('Reset restores the stub in the editor and clears the stored draft', () => {
    localStorage.setItem(DRAFT_KEY, 'my draft');
    const fixture = setUp('90', [PROBLEM]);

    click(fixture.nativeElement, 'Reset');

    expect(setTextSpy).toHaveBeenCalledWith(STUB);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
