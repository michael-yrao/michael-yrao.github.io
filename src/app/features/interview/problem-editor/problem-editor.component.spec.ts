import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { PracticeData } from '../../../core/models/practice.model';
import { GOLD_STANDARD_REPO } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { EMPTY_PROBLEM } from '../interview-page/interview-draft';
import type { InterviewProblem } from '../session/interview-problem';
import { ProblemEditorComponent } from './problem-editor.component';

const TWO_SUM_STARTER = 'class Solution:\n    def twoSum(self, nums):\n        pass\n';
const IMPORTED_ENTRY = { className: 'Solution', method: 'existing' };

const WITH_CASE: InterviewProblem = {
  ...EMPTY_PROBLEM,
  cases: [{ args: [], expected: null, example: false }],
};

const WITH_OPS_CASE: InterviewProblem = {
  ...EMPTY_PROBLEM,
  source: 1,
  entry: { className: 'MinStack', method: '', kind: 'ops' },
  cases: [{ args: [[]], ops: ['MinStack'], expected: [null], example: false }],
};

@Component({ selector: 'app-code-editor', template: '' })
class StubEditorComponent {
  readonly initialText = input.required<string>();
  readonly textChange = output<string>();
  setText(): void {
    // The tests drive `textChange` directly.
  }
}

function setUp(problem: InterviewProblem) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems: [] };
  TestBed.configureTestingModule({
    imports: [ProblemEditorComponent],
    providers: [
      {
        provide: PracticeService,
        useValue: {
          status: signal('ready'),
          error: signal(null),
          data: signal(data),
          ref: signal(GOLD_STANDARD_REPO),
          load: vi.fn(),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(convertToParamMap({})), snapshot: { queryParamMap: convertToParamMap({}) } },
      },
    ],
  });
  TestBed.overrideComponent(ProblemEditorComponent, {
    remove: { imports: [CodeEditorComponent] },
    add: { imports: [StubEditorComponent] },
  });
  const fixture = TestBed.createComponent(ProblemEditorComponent);
  fixture.componentRef.setInput('problem', problem);
  const emitted: InterviewProblem[] = [];
  fixture.componentInstance.problemChange.subscribe((value) => emitted.push(value));
  fixture.detectChanges();
  return { fixture, emitted };
}

function typeInto(field: HTMLInputElement, text: string): void {
  field.value = text;
  field.dispatchEvent(new Event('input'));
}

describe('ProblemEditorComponent', () => {
  it.each([
    [WITH_CASE, 'args', '[1, 2]', true, [1, 2]],
    [WITH_CASE, 'args', '[1,', false, null],
    [WITH_CASE, 'args', '{}', false, null],
    // Each field parses alone, but one op against no args breaks the whole case.
    [WITH_OPS_CASE, 'ops', '["MinStack","push"]', false, null],
  ])('%#: %s field %s', (problem, fieldName, text, isValid, expectedValue) => {
    const { fixture, emitted } = setUp(problem);
    const field: HTMLInputElement = fixture.nativeElement.querySelector(`[data-field="${fieldName}"]`);

    typeInto(field, text);
    fixture.detectChanges();

    expect(emitted.length).toBe(isValid ? 1 : 0);
    if (isValid) expect(emitted[0].cases[0].args).toEqual(expectedValue);
    expect(field.getAttribute('aria-invalid')).toBe(isValid ? null : 'true');
    expect(fixture.componentInstance.hasInvalidField()).toBe(!isValid);
  });

  it.each([
    ['a hand-written problem derives the entry from the starter', null, EMPTY_PROBLEM.entry, { className: 'Solution', method: 'twoSum' }],
    ['an imported problem keeps its own entry', 1, IMPORTED_ENTRY, IMPORTED_ENTRY],
  ])('%s', (_name, source, entry, expectedEntry) => {
    const { fixture, emitted } = setUp({ ...EMPTY_PROBLEM, source, entry });
    const editor: StubEditorComponent = fixture.debugElement.query(By.directive(StubEditorComponent)).componentInstance;

    editor.textChange.emit(TWO_SUM_STARTER);

    expect(emitted.length).toBe(1);
    expect(emitted[0].starter).toBe(TWO_SUM_STARTER);
    expect(emitted[0].entry).toEqual(expectedEntry);
  });
});
