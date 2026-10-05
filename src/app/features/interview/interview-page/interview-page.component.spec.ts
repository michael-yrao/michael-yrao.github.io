import { ApplicationRef, Component, input, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { toPracticeProblem } from '../problem-import';
import { InterviewBarComponent } from '../session/interview-bar/interview-bar.component';
import { STARTER_MAX_LENGTH, type InterviewProblem } from '../session/interview-problem';
import { InterviewSessionService } from '../session/interview-session.service';
import { PreparedInterviewsService, type LinkImport } from '../session/prepared-interviews.service';
import { INTERVIEW_DRAFT_KEY } from './interview-draft';
import { InterviewPageComponent, PUBLISH_DELAY_MS } from './interview-page.component';

const DOC = 'print(1)';
const RUN_BUTTON = 'button[aria-label="Run"]';
const PREPARE_BUTTON = 'button.practice__btn--primary:not([aria-label])';
const BUTTONS = 'button.practice__btn';
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
  template: '<ng-content />',
  providers: [{ provide: ProblemEditorComponent, useExisting: StubProblemEditorComponent }],
})
class StubProblemEditorComponent {
  readonly problem = input.required<InterviewProblem>();
  readonly problemChange = output<InterviewProblem>();
  readonly isRejected = input(false);
  readonly isSplit = input(false);
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
    editProblem: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    join: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
  };
}

const SAVED_ID = 'p1';
const NEW_ID = 'p-new';
const PACKED = `packed-${SAVED_ID}`;
const SAVED = { ...PROBLEM, title: 'Saved' };
const DRAFT = { ...PROBLEM, title: 'Draft' };
const EDITED = { ...PROBLEM, title: 'Edited' };
const SECRET = 'secret-key';
const START_LABEL = 'Start interview';
const SELECT = '.interview-page__prepared select';
const UNREADABLE = 'The problem in this link could not be read.';
const SAVE_REFUSED = 'This browser could not save the prepared interview.';
const messageOf = (root: HTMLElement): string | null => root.querySelector('.practice__message')?.textContent?.trim() ?? null;

/** A stand-in for the prepared-interview store: one saved interview, `SAVED_ID`. */
function fakePrepared(importResult: LinkImport = 'saved') {
  return {
    list: signal([{ sessionId: SAVED_ID, title: SAVED.title, createdAt: 0 }]),
    prepare: vi.fn().mockResolvedValue(NEW_ID),
    packedOf: vi.fn((id: string) => `packed-${id}`),
    importLink: vi.fn().mockResolvedValue(importResult),
    refresh: vi.fn(),
  };
}

interface SetUpOptions {
  readonly query?: Record<string, string>;
  readonly fragment?: string | null;
  readonly prepared?: ReturnType<typeof fakePrepared>;
}

/** Lets every pending promise settle (real timers only). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function selectPrepared(root: HTMLElement, id: string): void {
  const select = root.querySelector<HTMLSelectElement>(SELECT)!;
  select.value = id;
  select.dispatchEvent(new Event('change'));
}

function setUp(session: ReturnType<typeof fakeSession>, options: SetUpOptions = {}) {
  const runner = { run: vi.fn(() => of()), runFree: vi.fn(() => of()) };
  const prepared = options.prepared ?? fakePrepared();
  const snapshot = { queryParamMap: convertToParamMap(options.query ?? {}), fragment: options.fragment ?? null };
  TestBed.configureTestingModule({
    imports: [InterviewPageComponent],
    providers: [
      provideRouter([]),
      { provide: InterviewSessionService, useValue: session },
      { provide: PreparedInterviewsService, useValue: prepared },
      { provide: PythonRunnerService, useValue: runner },
      { provide: ActivatedRoute, useValue: { snapshot } },
    ],
  });
  TestBed.overrideComponent(InterviewPageComponent, {
    remove: { imports: [CodeEditorComponent, InterviewBarComponent, ProblemEditorComponent] },
    add: { imports: [StubCodeEditorComponent, StubBarComponent, StubProblemEditorComponent] },
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(InterviewPageComponent);
  fixture.detectChanges();
  return { fixture, runner, prepared, navigate };
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
  isEditorSplit: boolean | null;
  hasPrepare: boolean;
  hasDescription: boolean;
}[] = [
  { role: 'none', problem: null, tabs: [], hasEditor: true, isEditorSplit: true, hasPrepare: true, hasDescription: false },
  { role: 'interviewer', problem: PROBLEM, tabs: ['Edit', 'View'], hasEditor: true, isEditorSplit: false, hasPrepare: false, hasDescription: false },
  { role: 'candidate', problem: PROBLEM, tabs: [], hasEditor: false, isEditorSplit: null, hasPrepare: false, hasDescription: true },
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

  it.each(ROLE_VIEWS)('what $role sees', ({ role, problem, tabs, hasEditor, isEditorSplit, hasPrepare, hasDescription }) => {
    const { fixture } = setUp(fakeSession(role, problem));
    const root = fixture.nativeElement as HTMLElement;
    const editor: StubProblemEditorComponent | undefined = fixture.debugElement.query(By.directive(StubProblemEditorComponent))?.componentInstance;

    expect(texts(root, TAB)).toEqual(tabs);
    expect(root.querySelector(PROBLEM_EDITOR) !== null).toBe(hasEditor);
    expect(editor?.isSplit() ?? null).toBe(isEditorSplit);
    expect(root.querySelector(PREPARE_BUTTON)?.textContent?.trim() ?? null).toBe(hasPrepare ? 'Prepare' : null);
    expect(texts(root, BUTTONS)).not.toContain(START_LABEL);
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

  it('a problem the session would reject is not sent', () => {
    vi.useFakeTimers();
    const session = fakeSession('interviewer', PROBLEM);
    const { fixture } = setUp(session);
    const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;

    editor.problemChange.emit({ ...PROBLEM, starter: 'x'.repeat(STARTER_MAX_LENGTH + 1) });
    vi.advanceTimersByTime(PUBLISH_DELAY_MS);

    expect(session.editProblem).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'valid: prepared, then resumed with its key, the draft kept', isRejected: false, created: NEW_ID as string | null, resumes: `packed-${NEW_ID}`, message: null },
    { name: 'refused by the browser: message shown, no resume', isRejected: false, created: null, resumes: null, message: SAVE_REFUSED },
    { name: 'rejected form: neither', isRejected: true, created: NEW_ID, resumes: null, message: null },
  ])('Prepare $name', async ({ isRejected, created, resumes, message }) => {
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(DRAFT));
    const session = fakeSession('none', null);
    const { fixture, prepared } = setUp(session);
    prepared.prepare.mockResolvedValue(created);
    const root: HTMLElement = fixture.nativeElement;
    if (isRejected) {
      const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;
      editor.problemChange.emit({ ...PROBLEM, starter: 'x'.repeat(STARTER_MAX_LENGTH + 1) });
    }

    root.querySelector<HTMLButtonElement>(PREPARE_BUTTON)!.click();
    await flush();
    fixture.detectChanges();

    if (isRejected) {
      expect(prepared.prepare).not.toHaveBeenCalled();
    } else {
      expect(prepared.prepare).toHaveBeenCalledExactlyOnceWith(DRAFT);
    }
    if (resumes === null) {
      expect(session.resume).not.toHaveBeenCalled();
    } else {
      expect(session.resume).toHaveBeenCalledExactlyOnceWith(resumes);
      expect(prepared.prepare.mock.invocationCallOrder[0]).toBeLessThan(session.resume.mock.invocationCallOrder[0]);
    }
    expect(localStorage.getItem(INTERVIEW_DRAFT_KEY)).toBe(JSON.stringify(DRAFT));
    expect(messageOf(root)).toBe(message);
  });

  it('choosing a prepared interview resumes its key and the picker returns to blank', () => {
    const session = fakeSession('none', null);
    const { fixture } = setUp(session);
    const root: HTMLElement = fixture.nativeElement;

    selectPrepared(root, SAVED_ID);

    expect(session.resume).toHaveBeenCalledExactlyOnceWith(PACKED);
    expect(root.querySelector<HTMLSelectElement>(SELECT)!.value).toBe('');
  });

  it.each([
    { name: 'good fragment: saved, stripped, resumed', isJoin: false, fragment: 'p=abc', result: 'saved' as LinkImport, strips: true, message: null },
    { name: 'bad fragment: message shown, still resumed', isJoin: false, fragment: 'p=bad', result: 'invalid' as LinkImport, strips: true, message: UNREADABLE },
    { name: 'refused save: save-refused message, still resumed', isJoin: false, fragment: 'p=ok', result: 'unsaved' as LinkImport, strips: true, message: SAVE_REFUSED },
    { name: 'host only: resumed, nothing imported', isJoin: false, fragment: null, result: 'saved' as LinkImport, strips: false, message: null },
    { name: 'join: joined, not resumed', isJoin: true, fragment: null, result: 'saved' as LinkImport, strips: false, message: null },
  ])('opening a link, $name', async ({ isJoin, fragment, result, strips, message }) => {
    const session = fakeSession('none', null);
    const query: Record<string, string> = isJoin ? { join: 'peer-id' } : { host: SECRET };
    const { fixture, prepared, navigate } = setUp(session, { query, fragment, prepared: fakePrepared(result) });

    await flush();
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    if (fragment === null) expect(prepared.importLink).not.toHaveBeenCalled();
    else expect(prepared.importLink).toHaveBeenCalledExactlyOnceWith(SECRET, fragment.slice('p='.length));
    expect(session.resume).toHaveBeenCalledTimes(isJoin ? 0 : 1);
    expect(session.join).toHaveBeenCalledTimes(isJoin ? 1 : 0);
    expect(navigate).toHaveBeenCalledTimes(strips ? 1 : 0);
    if (strips) expect(navigate.mock.calls[0][1]).toMatchObject({ queryParamsHandling: 'preserve', replaceUrl: true });
    expect(messageOf(fixture.nativeElement)).toBe(message);
  });

  it('returning to the setup role shows the draft and re-reads the prepared list', () => {
    vi.useFakeTimers();
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(DRAFT));
    const session = fakeSession('none', null);
    const { fixture, prepared } = setUp(session);
    session.role.set('interviewer');
    session.problem.set(PROBLEM);
    session.sharedDoc.set({ version: 0, doc: DOC, epoch: 0 });
    fixture.detectChanges();
    const inSession: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;
    inSession.problemChange.emit(EDITED);

    session.role.set('none');
    fixture.detectChanges();
    vi.advanceTimersByTime(PUBLISH_DELAY_MS);

    const editor: StubEditor = fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;
    expect(editor.problem()).toEqual(DRAFT);
    expect(localStorage.getItem(INTERVIEW_DRAFT_KEY)).toBe(JSON.stringify(DRAFT));
    expect(prepared.refresh).toHaveBeenCalledOnce();
  });
});
