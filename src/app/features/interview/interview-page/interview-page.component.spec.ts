import { Component, input, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { toPracticeProblem } from '../problem-import';
import { InterviewBarComponent } from '../session/interview-bar/interview-bar.component';
import { STARTER_MAX_LENGTH, type InterviewProblem } from '../session/interview-problem';
import { InterviewSessionService } from '../session/interview-session.service';
import { INTERVIEW_DRAFT_KEY } from './interview-draft';
import { InterviewPageComponent, PUBLISH_DELAY_MS } from './interview-page.component';

const DOC = 'print(1)';
const RUN_BUTTON = 'button[aria-label="Run"]';
const START_BUTTON = 'button.practice__btn--primary:not([aria-label])';
const TAB = '.practice__tab';
const PROBLEM_EDITOR = 'app-problem-editor';
const DESCRIPTION = 'app-practice-description';
const OLD_STARTER = 'S0';
const NEW_STARTER = 'S1';
const FIRST_STARTER = 'SA';

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
const CASE = { args: [1], expected: 1, example: true };
const ENTRY = { className: 'Solution', method: 'run' };

const setTextSpy = vi.fn();

// The page's queries look the editors up by their real class, so each stub answers to it.
@Component({
  selector: 'app-code-editor',
  template: '',
  providers: [{ provide: CodeEditorComponent, useExisting: StubCodeEditorComponent }],
})
class StubCodeEditorComponent {
  readonly initialText = input.required<string>();
  readonly extensions = input<readonly unknown[]>([]);
  readonly textChange = output<string>();
  readonly setText = setTextSpy;
}

@Component({
  selector: 'app-problem-editor',
  template: '',
  providers: [{ provide: ProblemEditorComponent, useExisting: StubProblemEditorComponent }],
})
class StubProblemEditorComponent {
  readonly problem = input.required<InterviewProblem>();
  readonly problemChange = output<InterviewProblem>();
  readonly isRejected = input(false);
  readonly hasInvalidField = signal(false);
}

@Component({ selector: 'app-interview-bar', template: '' })
class StubBarComponent {
  readonly problemLabel = input('');
}

function fakeSession(role: string, problem: InterviewProblem | null, doc = DOC) {
  return {
    role: signal(role),
    problem: signal(problem),
    status: signal('idle'),
    sharedDoc: signal(role === 'none' ? null : { version: 0, doc, epoch: 0 }),
    isEditable: signal(true),
    inviteUrl: signal<string | null>(null),
    hostUrl: signal<string | null>(null),
    myName: signal(''),
    roster: signal([]),
    linkParams: () => ({}),
    collabExtensions: () => [],
    start: vi.fn().mockResolvedValue(undefined),
    editProblem: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    join: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
  };
}

function setUp(session: ReturnType<typeof fakeSession>) {
  const runner = { run: vi.fn(() => of()), runFree: vi.fn(() => of()) };
  TestBed.configureTestingModule({
    imports: [InterviewPageComponent],
    providers: [
      provideRouter([]),
      { provide: InterviewSessionService, useValue: session },
      { provide: PythonRunnerService, useValue: runner },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
    ],
  });
  TestBed.overrideComponent(InterviewPageComponent, {
    remove: { imports: [CodeEditorComponent, InterviewBarComponent, ProblemEditorComponent] },
    add: { imports: [StubCodeEditorComponent, StubBarComponent, StubProblemEditorComponent] },
  });
  const fixture = TestBed.createComponent(InterviewPageComponent);
  fixture.detectChanges();
  return { fixture, runner };
}

const texts = (root: HTMLElement, selector: string): string[] =>
  Array.from(root.querySelectorAll(selector)).map((element) => element.textContent?.trim() ?? '');

const RUN_CASES: readonly {
  name: string;
  problem: InterviewProblem;
  runsCases: boolean;
}[] = [
  { name: 'cases and an entry run the cases', problem: { ...PROBLEM, cases: [CASE], entry: ENTRY }, runsCases: true },
  { name: 'no cases is a free run', problem: { ...PROBLEM, entry: ENTRY }, runsCases: false },
  { name: 'cases with a null entry is a free run', problem: { ...PROBLEM, cases: [CASE] }, runsCases: false },
];

const ROLE_VIEWS: readonly {
  role: string;
  problem: InterviewProblem | null;
  tabs: readonly string[];
  hasEditor: boolean;
  hasStart: boolean;
  hasDescription: boolean;
}[] = [
  { role: 'none', problem: null, tabs: [], hasEditor: true, hasStart: true, hasDescription: false },
  { role: 'interviewer', problem: PROBLEM, tabs: ['Edit', 'View'], hasEditor: true, hasStart: false, hasDescription: false },
  { role: 'candidate', problem: PROBLEM, tabs: [], hasEditor: false, hasStart: false, hasDescription: true },
];

const STARTER_RULE: readonly { name: string; doc: string; hasEarlierPublish: boolean; setsText: boolean }[] = [
  { name: 'the document still holds the old starter: it follows the new one', doc: OLD_STARTER, hasEarlierPublish: false, setsText: true },
  { name: 'the document has been edited: it is left alone', doc: 'my own code', hasEarlierPublish: false, setsText: false },
  { name: 'a second publish before the first echo: the untouched document follows it', doc: FIRST_STARTER, hasEarlierPublish: true, setsText: true },
];

interface StubEditor {
  problemChange: { emit: (problem: InterviewProblem) => void };
  problem: () => InterviewProblem;
  isRejected: () => boolean;
}

const FIRST = { ...PROBLEM, title: 'P1' };
const SECOND = { ...PROBLEM, title: 'P2' };
const FOREIGN = { ...PROBLEM, title: 'Foreign' };

const ADOPT_ROWS: readonly {
  name: string;
  act: (editor: StubEditor, session: ReturnType<typeof fakeSession>) => void;
  formAfter: InterviewProblem;
  isRejectedAfter: boolean;
}[] = [
  {
    name: 'own stale echo leaves the newer publish in the form',
    act: (editor, session) => {
      editor.problemChange.emit(FIRST);
      vi.advanceTimersByTime(PUBLISH_DELAY_MS);
      editor.problemChange.emit(SECOND);
      vi.advanceTimersByTime(PUBLISH_DELAY_MS);
      session.problem.set(FIRST);
    },
    formAfter: SECOND,
    isRejectedAfter: false,
  },
  {
    name: 'foreign problem, nothing pending: the form becomes it',
    act: (_editor, session) => session.problem.set(FOREIGN),
    formAfter: FOREIGN,
    isRejectedAfter: false,
  },
  {
    name: 'foreign problem while the debounce is pending: the form is unchanged',
    act: (editor, session) => {
      editor.problemChange.emit(SECOND);
      session.problem.set(FOREIGN);
    },
    formAfter: SECOND,
    isRejectedAfter: false,
  },
  {
    name: 'foreign problem after a rejected form: the form becomes it and the mark clears',
    act: (editor, session) => {
      editor.problemChange.emit({ ...PROBLEM, starter: 'x'.repeat(STARTER_MAX_LENGTH + 1) });
      vi.advanceTimersByTime(PUBLISH_DELAY_MS);
      session.problem.set(FOREIGN);
    },
    formAfter: FOREIGN,
    isRejectedAfter: false,
  },
];

describe('InterviewPageComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(INTERVIEW_DRAFT_KEY);
    setTextSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(INTERVIEW_DRAFT_KEY);
  });

  it.each(RUN_CASES)('Run dispatch: $name', ({ problem, runsCases }) => {
    const { fixture, runner } = setUp(fakeSession('interviewer', problem));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(RUN_BUTTON)!.click();

    if (runsCases) {
      expect(runner.run).toHaveBeenCalledExactlyOnceWith(DOC, toPracticeProblem(problem));
      expect(runner.runFree).not.toHaveBeenCalled();
    } else {
      expect(runner.runFree).toHaveBeenCalledExactlyOnceWith(DOC);
      expect(runner.run).not.toHaveBeenCalled();
    }
  });

  it.each(ROLE_VIEWS)('what $role sees', ({ role, problem, tabs, hasEditor, hasStart, hasDescription }) => {
    const { fixture } = setUp(fakeSession(role, problem));
    const root = fixture.nativeElement as HTMLElement;

    expect(texts(root, TAB)).toEqual(tabs);
    expect(root.querySelector(PROBLEM_EDITOR) !== null).toBe(hasEditor);
    expect(root.querySelector(START_BUTTON)?.textContent?.trim() ?? null).toBe(hasStart ? 'Start interview' : null);
    expect(root.querySelector(DESCRIPTION) !== null).toBe(hasDescription);
  });

  it.each(STARTER_RULE)('starter rule: $name', ({ doc, hasEarlierPublish, setsText }) => {
    vi.useFakeTimers();
    const published = { ...PROBLEM, starter: OLD_STARTER };
    const session = fakeSession('interviewer', published, doc);
    const { fixture } = setUp(session);
    const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;

    if (hasEarlierPublish) {
      editor.problemChange.emit({ ...published, starter: FIRST_STARTER });
      vi.advanceTimersByTime(PUBLISH_DELAY_MS);
      setTextSpy.mockClear();
    }
    editor.problemChange.emit({ ...published, starter: NEW_STARTER });
    vi.advanceTimersByTime(PUBLISH_DELAY_MS);

    if (setsText) expect(setTextSpy).toHaveBeenCalledExactlyOnceWith(NEW_STARTER);
    else expect(setTextSpy).not.toHaveBeenCalled();
    expect(session.editProblem).toHaveBeenCalledTimes(hasEarlierPublish ? 2 : 1);
  });

  it.each(ADOPT_ROWS)('adopting the session problem: $name', ({ act, formAfter, isRejectedAfter }) => {
    vi.useFakeTimers();
    const session = fakeSession('interviewer', PROBLEM);
    const { fixture } = setUp(session);
    const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;

    act(editor, session);
    fixture.detectChanges();

    expect(editor.problem()).toEqual(formAfter);
    expect(editor.isRejected()).toBe(isRejectedAfter);
  });

  it.each(['interviewer', 'none'])('a problem the session would reject is not sent (%s)', (role) => {
    vi.useFakeTimers();
    const session = fakeSession(role, role === 'none' ? null : PROBLEM);
    const { fixture } = setUp(session);
    const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;

    editor.problemChange.emit({ ...PROBLEM, starter: 'x'.repeat(STARTER_MAX_LENGTH + 1) });
    if (role === 'none') {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(START_BUTTON)!.click();
    } else {
      vi.advanceTimersByTime(PUBLISH_DELAY_MS);
    }

    expect(session.editProblem).not.toHaveBeenCalled();
    expect(session.start).not.toHaveBeenCalled();
  });
});
