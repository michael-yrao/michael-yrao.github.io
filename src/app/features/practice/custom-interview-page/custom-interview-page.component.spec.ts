import { Component, input, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { InterviewBarComponent } from '../interview/interview-bar/interview-bar.component';
import { CUSTOM_PROBLEM, InterviewSessionService } from '../interview/interview-session.service';
import type { CustomProblem } from '../interview/interview-session.service';
import { SIGNATURE_LENGTH } from '../interview/host-key';
import { CustomInterviewPageComponent } from './custom-interview-page.component';

const DRAFT_KEY = 'po-custom-draft';
const START_BUTTON = 'button.practice__btn--primary:not([aria-label])';
const TITLE_INPUT = 'input.custom__input';
const STATEMENT_INPUT = 'textarea.custom__input';

const CUSTOM: CustomProblem = { title: 'Pair sum', statement: 'Find two numbers that add up to the target.', signature: 'S'.repeat(SIGNATURE_LENGTH) };

@Component({ selector: 'app-code-editor', template: '' })
class StubEditorComponent {
  readonly initialText = input.required<string>();
  readonly extensions = input<readonly unknown[]>([]);
  readonly textChange = output<string>();
}

@Component({ selector: 'app-interview-bar', template: '' })
class StubBarComponent {
  readonly isInSession = input(false);
  readonly problemLabel = input('');
}

function fakeSession(role: string, problem: number | null, custom: CustomProblem | null) {
  return {
    role: signal(role),
    problem: signal(problem),
    custom: signal(custom),
    status: signal('idle'),
    hostUrl: signal<string | null>(null),
    sharedDoc: signal(role === 'none' ? null : { problem: CUSTOM_PROBLEM, version: 0, doc: 'print(1)', epoch: 0 }),
    collabExtensions: () => [],
    start: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    join: vi.fn().mockResolvedValue(undefined),
  };
}

function setUp(session: ReturnType<typeof fakeSession>) {
  const query = convertToParamMap({});
  TestBed.configureTestingModule({
    imports: [CustomInterviewPageComponent],
    providers: [
      provideRouter([]),
      { provide: InterviewSessionService, useValue: session },
      { provide: PythonRunnerService, useValue: { runFree: vi.fn(() => of()) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: query } } },
    ],
  });
  TestBed.overrideComponent(CustomInterviewPageComponent, {
    remove: { imports: [CodeEditorComponent, InterviewBarComponent] },
    add: { imports: [StubEditorComponent, StubBarComponent] },
  });
  const fixture = TestBed.createComponent(CustomInterviewPageComponent);
  fixture.detectChanges();
  return fixture;
}

function type(root: HTMLElement, selector: string, value: string): void {
  const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

const START_CASES: readonly { name: string; title: string; statement: string; isEnabled: boolean }[] = [
  { name: 'empty and empty', title: '', statement: '', isEnabled: false },
  { name: 'title only', title: 'Pair sum', statement: '', isEnabled: false },
  { name: 'problem only', title: '', statement: 'Find a pair.', isEnabled: false },
  { name: 'whitespace only', title: '   ', statement: ' \n ', isEnabled: false },
  { name: 'both set', title: 'Pair sum', statement: 'Find a pair.', isEnabled: true },
];

describe('CustomInterviewPageComponent', () => {
  beforeEach(() => localStorage.removeItem(DRAFT_KEY));
  afterEach(() => localStorage.removeItem(DRAFT_KEY));

  it.each(START_CASES)('Start is enabled only with a title and a problem: $name', ({ title, statement, isEnabled }) => {
    const fixture = setUp(fakeSession('none', null, null));
    const root = fixture.nativeElement as HTMLElement;

    type(root, TITLE_INPUT, title);
    type(root, STATEMENT_INPUT, statement);
    fixture.detectChanges();

    expect(root.querySelector<HTMLButtonElement>(START_BUTTON)!.disabled).toBe(!isEnabled);
  });

  it('Start begins the session on the custom problem with the starter code and the typed payload', () => {
    const session = fakeSession('none', null, null);
    const fixture = setUp(session);
    const root = fixture.nativeElement as HTMLElement;

    type(root, TITLE_INPUT, '  Pair sum ');
    type(root, STATEMENT_INPUT, 'Find a pair.');
    fixture.debugElement.query(By.directive(StubEditorComponent)).componentInstance.textChange.emit('def pair(): ...');
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>(START_BUTTON)!.click();

    expect(session.start).toHaveBeenCalledExactlyOnceWith(
      CUSTOM_PROBLEM,
      'def pair(): ...',
      expect.stringContaining('http'),
      { title: 'Pair sum', statement: 'Find a pair.' },
    );
  });

  it('in a session the statement on the page comes from the session', () => {
    const fixture = setUp(fakeSession('interviewer', CUSTOM_PROBLEM, CUSTOM));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(CUSTOM.title);
    expect(text).toContain(CUSTOM.statement);
  });
});
