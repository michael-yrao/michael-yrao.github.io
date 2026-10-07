import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { createSavedProblem } from '../saved-problem-store';
import type { InterviewProblem } from '../session/interview-problem';
import { InterviewTryComponent } from './interview-try.component';

const RUN_BUTTON = 'button[aria-label="Run"]';
const NOT_FOUND = 'That saved problem was not found.';
const UNKNOWN_ID = 'no-such-problem';
const SAVED_AT = 1;

const PROBLEM: InterviewProblem = {
  title: 'Pair sum',
  statement: 'Find two numbers that add up to the target.',
  starter: '',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};

// The page's query looks the editor up by its real class, so the stub answers to it.
@Component({
  selector: 'app-code-editor',
  template: '',
  providers: [{ provide: CodeEditorComponent, useExisting: StubCodeEditorComponent }],
})
class StubCodeEditorComponent {
  readonly initialText = input.required<string>();
  readonly extensions = input<readonly unknown[]>([]);
  readonly textChange = output<string>();
  readonly setText = vi.fn();
}

function render(id: string): HTMLElement {
  TestBed.configureTestingModule({
    imports: [InterviewTryComponent],
    providers: [
      provideRouter([]),
      { provide: PythonRunnerService, useValue: { run: vi.fn(() => of()), runFree: vi.fn(() => of()) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  });
  TestBed.overrideComponent(InterviewTryComponent, {
    remove: { imports: [CodeEditorComponent] },
    add: { imports: [StubCodeEditorComponent] },
  });
  const fixture = TestBed.createComponent(InterviewTryComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const savedId = (): string => createSavedProblem(PROBLEM, SAVED_AT) ?? '';

const CASES: readonly { name: string; idFor: () => string; hasProblem: boolean }[] = [
  { name: 'a known id shows the problem and Run', idFor: savedId, hasProblem: true },
  { name: 'an unknown id says it was not found', idFor: () => UNKNOWN_ID, hasProblem: false },
];

describe('InterviewTryComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it.each(CASES)('$name', ({ idFor, hasProblem }) => {
    const root = render(idFor());
    const text = root.textContent ?? '';
    expect(text.includes(PROBLEM.title)).toBe(hasProblem);
    expect(root.querySelector(RUN_BUTTON) !== null).toBe(hasProblem);
    expect(text.includes(NOT_FOUND)).toBe(!hasProblem);
  });
});
