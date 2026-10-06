import { Component, input, output, signal } from '@angular/core';
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
import { EMPTY_NOTES } from '../session/debrief';
import { listDebriefs, saveDebrief } from '../session/debrief-store';
import { InterviewSessionService, type EndedSession } from '../session/interview-session.service';
import { PreparedInterviewsService, type CodeEntry } from '../session/prepared-interviews.service';
import { formatDebriefDate } from './interview-format';
import { InterviewPageComponent, PUBLISH_DELAY_MS } from './interview-page.component';

const DOC = 'print(1)';
const RUN_BUTTON = 'button[aria-label="Run"]';
const CODE_INPUT = '.interview-page__code input';
const ENTER_BUTTON = '.interview-page__code button';
const PREPARE_LINK = 'a[href="/interview/prepare"]';
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
  const ended = signal<EndedSession | null>(null);
  return {
    role: signal(role),
    problem: signal(problem),
    status: signal('idle'),
    sessionId: signal<string | null>(null),
    startedAt: signal<number | null>(null),
    ended,
    clearEnded: vi.fn(() => ended.set(null)),
    sharedDoc: signal(role === 'none' ? null : { version: 0, doc, epoch: 0 }),
    isEditable: signal(true),
    inviteUrl: signal<string | null>(null),
    hostUrl: signal<string | null>(null),
    myName: signal(''),
    roster: signal([]),
    linkParams: signal<Record<string, string | undefined>>({}),
    collabExtensions: () => [],
    editProblem: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    join: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
  };
}

const PACKED = 'packed-key';
const PUBLIC_RAW = 'public-raw';
const CODE = 'K7QF-2M9X';
const messageOf = (root: HTMLElement): string | null => root.querySelector('.practice__message')?.textContent?.trim() ?? null;

/** A stand-in for the prepared-interview store: every code answers with `entry`. */
function fakePrepared(entry: CodeEntry = { status: 'invalid' }) {
  return {
    enterCode: vi.fn().mockResolvedValue(entry),
    list: signal([]),
    retryUnpublished: vi.fn().mockResolvedValue(undefined),
    codesOf: vi.fn().mockReturnValue(null),
    packedOf: vi.fn().mockReturnValue(null),
  };
}

interface SetUpOptions {
  readonly query?: Record<string, string>;
  readonly prepared?: ReturnType<typeof fakePrepared>;
}

/** Lets every pending promise settle (real timers only). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function setUp(session: ReturnType<typeof fakeSession>, options: SetUpOptions = {}) {
  const runner = { run: vi.fn(() => of()), runFree: vi.fn(() => of()) };
  const prepared = options.prepared ?? fakePrepared();
  const snapshot = { queryParamMap: convertToParamMap(options.query ?? {}) };
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
  hasLanding: boolean;
  hasDescription: boolean;
}[] = [
  { role: 'none', problem: null, tabs: [], hasEditor: false, hasLanding: true, hasDescription: false },
  { role: 'interviewer', problem: PROBLEM, tabs: ['Edit', 'View', 'Notes'], hasEditor: true, hasLanding: false, hasDescription: false },
  { role: 'candidate', problem: PROBLEM, tabs: [], hasEditor: false, hasLanding: false, hasDescription: true },
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

const DEBRIEF_PATH = '/interview/debrief';
const ENDED_AT = Date.UTC(2026, 9, 5, 12);
const ENDED: EndedSession = {
  sessionId: 'ended-1',
  role: 'interviewer',
  title: 'Pair sum',
  source: null,
  summary: { v: 1, startedAt: ENDED_AT - 600_000, endedAt: ENDED_AT, awayCount: 0, pasteCount: 0, notes: EMPTY_NOTES },
  finalCode: DOC,
};
const SAVED = { ...ENDED, sessionId: 'saved-1', role: 'candidate' as const, lastRun: null };
const SAVED_DATE = formatDebriefDate(ENDED_AT);

const END_ROWS: readonly { name: string; hasEnded: boolean }[] = [
  { name: 'an ended session is saved and opens its debrief', hasEnded: true },
  { name: 'no ended session stays on the landing', hasEnded: false },
];

describe('InterviewPageComponent', () => {
  beforeEach(() => {
    setTextSpy.mockClear();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

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

  it.each(ROLE_VIEWS)('what $role sees', ({ role, problem, tabs, hasEditor, hasLanding, hasDescription }) => {
    const { fixture } = setUp(fakeSession(role, problem));
    const root = fixture.nativeElement as HTMLElement;

    expect(texts(root, TAB)).toEqual(tabs);
    expect(root.querySelector(PROBLEM_EDITOR) !== null).toBe(hasEditor);
    expect(root.querySelector(CODE_INPUT) !== null).toBe(hasLanding);
    expect(root.querySelector(PREPARE_LINK) !== null).toBe(hasLanding);
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
    { name: 'an interviewer code in the address resumes its key', via: 'url', entry: { status: 'interviewer', packed: PACKED } as CodeEntry, resumes: PACKED, joins: null, params: { host: PACKED } },
    { name: 'a candidate code in the address joins its interview', via: 'url', entry: { status: 'candidate', publicRaw: PUBLIC_RAW } as CodeEntry, resumes: null, joins: PUBLIC_RAW, params: { join: PUBLIC_RAW } },
    { name: 'a code typed and entered takes the same path', via: 'button', entry: { status: 'interviewer', packed: PACKED } as CodeEntry, resumes: PACKED, joins: null, params: { host: PACKED } },
  ])('entering a code: $name', async ({ via, entry, resumes, joins, params }) => {
    const session = fakeSession('none', null);
    const prepared = fakePrepared(entry);
    const { fixture, navigate } = setUp(session, { query: via === 'url' ? { code: CODE } : {}, prepared });
    const root: HTMLElement = fixture.nativeElement;
    if (via === 'button') {
      root.querySelector<HTMLInputElement>(CODE_INPUT)!.value = CODE;
      root.querySelector<HTMLButtonElement>(ENTER_BUTTON)!.click();
    }
    await flush();

    expect(prepared.enterCode).toHaveBeenCalledExactlyOnceWith(CODE);
    if (resumes === null) expect(session.resume).not.toHaveBeenCalled();
    else expect(session.resume).toHaveBeenCalledExactlyOnceWith(resumes);
    if (joins === null) expect(session.join).not.toHaveBeenCalled();
    else expect(session.join).toHaveBeenCalledExactlyOnceWith(joins);

    session.role.set(resumes === null ? 'candidate' : 'interviewer');
    session.linkParams.set(params);
    fixture.detectChanges();
    expect(navigate.mock.calls.at(-1)?.[1]).toMatchObject({ queryParams: { code: null, ...params }, queryParamsHandling: 'merge', replaceUrl: true });
  });

  it.each([
    { status: 'invalid', message: 'Enter an 8- or 12-character code.' },
    { status: 'not-found', message: 'No interview has this code. If it was just created, try again in a minute.' },
    { status: 'deleted', message: 'This interview was deleted.' },
    { status: 'unreadable', message: 'This interview could not be read.' },
    { status: 'offline', message: 'Could not reach the server.' },
    { status: 'rate-limited', message: 'Too many tries. Wait a minute.' },
    { status: 'disabled', message: 'This code works only in the browser that created it.' },
    { status: 'unsaved', message: 'This browser could not save the problem.' },
  ] as const)('a code that fails as $status says why and opens nothing', async ({ status, message }) => {
    const session = fakeSession('none', null);
    const { fixture } = setUp(session, { prepared: fakePrepared({ status }) });
    const root: HTMLElement = fixture.nativeElement;

    root.querySelector<HTMLInputElement>(CODE_INPUT)!.value = CODE;
    root.querySelector<HTMLButtonElement>(ENTER_BUTTON)!.click();
    await flush();
    fixture.detectChanges();

    expect(messageOf(root)).toBe(message);
    expect(session.resume).not.toHaveBeenCalled();
    expect(session.join).not.toHaveBeenCalled();
  });

  it.each(END_ROWS)('End: $name', ({ hasEnded }) => {
    const session = fakeSession('interviewer', PROBLEM);
    const { fixture, navigate } = setUp(session);
    if (hasEnded) session.ended.set(ENDED);
    fixture.detectChanges();

    const debriefCalls = navigate.mock.calls.filter(([commands]) => Array.isArray(commands) && commands[0] === DEBRIEF_PATH);
    if (!hasEnded) {
      expect(debriefCalls).toEqual([]);
      expect(listDebriefs()).toEqual([]);
      return;
    }
    expect(listDebriefs().map((item) => item.sessionId)).toEqual([ENDED.sessionId]);
    expect(debriefCalls).toEqual([[[DEBRIEF_PATH, ENDED.sessionId], { replaceUrl: true }]]);
  });

  it('End: a page opened after the debrief does not save or open it again', () => {
    const session = fakeSession('interviewer', PROBLEM);
    const { fixture, navigate } = setUp(session);
    session.ended.set(ENDED);
    fixture.detectChanges();
    const debriefCalls = () => navigate.mock.calls.filter(([commands]) => Array.isArray(commands) && commands[0] === DEBRIEF_PATH);
    expect(debriefCalls()).toHaveLength(1);

    TestBed.createComponent(InterviewPageComponent).detectChanges();

    expect(debriefCalls()).toHaveLength(1);
  });

  it.each([
    { name: 'a saved debrief is listed as a link', saved: [SAVED], rows: ['Pair sum · ' + SAVED_DATE + ' · Candidate'], href: '/interview/debrief/' + SAVED.sessionId },
    { name: 'none saved: the panel is absent', saved: [], rows: [], href: null },
  ])('the landing lists past interviews: $name', ({ saved, rows, href }) => {
    for (const debrief of saved) saveDebrief(debrief);
    const { fixture } = setUp(fakeSession('none', null));
    const root = fixture.nativeElement as HTMLElement;

    expect(texts(root, '.interview-page__past-link')).toEqual(rows);
    expect(root.querySelector('.interview-page__past') !== null).toBe(saved.length > 0);
    expect(root.querySelector('.interview-page__past-link')?.getAttribute('href') ?? null).toBe(href);
  });
});
