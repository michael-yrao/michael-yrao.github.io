import { Component, Provider, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { SESSION_KEY } from '../../../core/auth/auth.service';
import { WORKER_API_URL } from '../../../core/data/site-links';
import { createMemoryStorage } from '../../../core/memory-storage.testing';
import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import { CONTENT_REPO } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { BigOService } from '../../../core/services/big-o.service';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { TodaySessionService } from '../../../core/today-session/today-session.service';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { PracticePageComponent } from './practice-page.component';

const OWNER = CONTENT_REPO.owner;
const TABS_KEY = `po-practice-tabs:${OWNER}/${CONTENT_REPO.repo}:90`;
const SAVE_BUTTON = 'Save to GitHub';
const MARK_COMPLETE = 'Mark Complete';
const REMOTE_SAVED_AT = '2026-10-10T12:00:00.000Z';
const REMOTE_CODE = 'remote code\n';
const REMOTE_FILE = `# po-attempt: {"complete":false,"rating":null,"tests":null,"complexity":null,"savedAt":"${REMOTE_SAVED_AT}"}\n${REMOTE_CODE}`;
const POOL = ['O(1)', 'O(n)', 'O(n log n)'];
const REFERENCE_ENTRY = { time: 'O(n)', space: 'O(1)', whyTime: 'one pass', whySpace: 'two counters' };
const WHY = 'one pass over the input';

const PROBLEM: PracticeProblem = {
  number: 90,
  title: 'Subsets II',
  url: 'https://leetcode.com/problems/subsets-ii/',
  statement: 'Return all subsets.',
  stub: 'stub\n',
  entry: { className: 'Solution', method: 'subsetsWithDup' },
  compare: 'unordered-nested',
  cases: [
    { args: [[1, 2]], expected: [[1], [2]], example: true },
    { args: [[3]], expected: [[3]], example: true },
    { args: [[4]], expected: [[4]], example: false },
  ],
};

function runOf(verdicts: readonly ('pass' | 'fail')[]): RunState {
  return {
    status: 'done',
    runError: null,
    results: verdicts.map((verdict, index) => ({
      index,
      verdict,
      outcome: { status: 'ok', hasJson: true, gotJson: null, gotRepr: 'None', stdout: '' },
    })),
  };
}

const setTextSpy = vi.fn();
const runSpy = vi.fn();

@Component({ selector: 'app-code-editor', template: '' })
class StubEditorComponent {
  readonly initialText = input.required<string>();
  readonly textChange = output<string>();
  setText(text: string): void {
    setTextSpy(text);
  }
  setErrorLine(): void {}
}

function signIn(login: string): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: 'ghu_secret', login, expiresAt: null, refreshToken: null, refreshExpiresAt: null }),
  );
}

function render(extraProviders: readonly Provider[] = []): {
  fixture: ComponentFixture<PracticePageComponent>;
  httpMock: HttpTestingController;
} {
  const params = convertToParamMap({ number: '90' });
  const query = convertToParamMap({});
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems: [PROBLEM] };
  TestBed.configureTestingModule({
    imports: [PracticePageComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: TodaySessionService, useValue: { active: () => false, contains: () => false, isRunning: () => false } },
      ...extraProviders,
      {
        provide: PracticeService,
        useValue: {
          status: signal('ready'),
          error: signal(null),
          data: signal(data),
          ref: signal(CONTENT_REPO),
          load: vi.fn(),
          problemFor: () => PROBLEM,
        },
      },
      { provide: ShowcaseService, useValue: { data: signal(null), load: vi.fn(), entryFor: () => null } },
      {
        provide: BigOService,
        useValue: { status: signal('ready'), load: vi.fn(), pool: () => POOL, entryFor: () => REFERENCE_ENTRY },
      },
      { provide: PythonRunnerService, useValue: { run: runSpy } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(params), queryParamMap: of(query), snapshot: { paramMap: params, queryParamMap: query } },
      },
    ],
  });
  TestBed.overrideComponent(PracticePageComponent, {
    remove: { imports: [CodeEditorComponent] },
    add: { imports: [StubEditorComponent] },
  });
  const fixture = TestBed.createComponent(PracticePageComponent);
  fixture.detectChanges();
  return { fixture, httpMock: TestBed.inject(HttpTestingController) };
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
}

function clickRun(fixture: ComponentFixture<PracticePageComponent>, isSample: boolean): void {
  const root: HTMLElement = fixture.nativeElement;
  const run = isSample ? root.querySelector<HTMLButtonElement>('button[aria-label="Run"]') : buttonByText(root, 'Run all');
  run!.click();
  fixture.detectChanges();
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function headerOf(content: string): unknown {
  return JSON.parse(content.split('\n', 1)[0].replace('# po-attempt: ', ''));
}

/** The open complete-rep panel: both bounds with a why, Check, a rating, Save rep. */
function rateAndSave(fixture: ComponentFixture<PracticePageComponent>): void {
  const root: HTMLElement = fixture.nativeElement;
  const rows = Array.from(root.querySelectorAll('.rep__row'));
  const chipIn = (row: Element, label: string): HTMLButtonElement =>
    Array.from(row.querySelectorAll<HTMLButtonElement>('.rep__chip')).find((b) => b.textContent?.trim() === label)!;
  chipIn(rows[0], 'O(n)').click();
  chipIn(rows[1], 'O(1)').click();
  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('.rep__why-input'))) {
    input.value = WHY;
    input.dispatchEvent(new Event('input'));
  }
  fixture.detectChanges();
  buttonByText(root, 'Check')!.click();
  fixture.detectChanges();
  root.querySelector<HTMLInputElement>('input[type="radio"]')!.click();
  fixture.detectChanges();
  buttonByText(root, 'Save rep')!.click();
}

describe('PracticePageComponent save to GitHub', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    setTextSpy.mockClear();
    runSpy.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    { name: 'signed out', login: null },
    { name: 'signed in as another user', login: 'visitor' },
  ])('$name: no save buttons', ({ login }) => {
    if (login !== null) signIn(login);
    const { fixture, httpMock } = render();
    const root: HTMLElement = fixture.nativeElement;

    expect(buttonByText(root, SAVE_BUTTON)).toBeUndefined();
    expect(buttonByText(root, MARK_COMPLETE)).toBeUndefined();
    httpMock.expectNone(`${WORKER_API_URL}practice/latest`);
  });

  const MARK_ROWS: readonly {
    readonly name: string;
    readonly verdicts: readonly ('pass' | 'fail')[] | null;
    readonly editAfter: boolean;
    readonly isSample: boolean;
    readonly isEnabled: boolean;
  }[] = [
    { name: 'never run', verdicts: null, editAfter: false, isSample: false, isEnabled: false },
    { name: 'not every case passed', verdicts: ['pass', 'pass', 'fail'], editAfter: false, isSample: false, isEnabled: false },
    { name: 'edited after a passing run', verdicts: ['pass', 'pass', 'pass'], editAfter: true, isSample: false, isEnabled: false },
    { name: 'a sample run that passed every sampled case', verdicts: ['pass', 'pass'], editAfter: false, isSample: true, isEnabled: false },
    { name: 'a fresh full pass', verdicts: ['pass', 'pass', 'pass'], editAfter: false, isSample: false, isEnabled: true },
  ];

  it.each(MARK_ROWS)('Mark Complete, owner, $name: enabled is $isEnabled', ({ verdicts, editAfter, isSample, isEnabled }) => {
    signIn(OWNER.toUpperCase()); // the owner match ignores case
    if (verdicts !== null) runSpy.mockReturnValue(of(runOf(verdicts)));
    const { fixture } = render();
    const root: HTMLElement = fixture.nativeElement;

    if (verdicts !== null) clickRun(fixture, isSample);
    if (editAfter) fixture.componentInstance.onTextChange('changed after the run');
    fixture.detectChanges();

    expect(buttonByText(root, SAVE_BUTTON)).toBeDefined();
    expect(buttonByText(root, MARK_COMPLETE)!.disabled).toBe(!isEnabled);
  });

  it.each([
    {
      name: 'Mark Complete, dialog, Check, rating, Save rep',
      isComplete: true,
      expected: {
        complete: true,
        rating: 'clean',
        complexity: { time: 'O(n)', space: 'O(1)', whyTime: WHY, whySpace: WHY },
      },
    },
    { name: 'Save to GitHub', isComplete: false, expected: { complete: false, rating: null, complexity: null } },
  ])('$name posts a header with the expected complexity and rating', async ({ isComplete, expected }) => {
    signIn(OWNER);
    runSpy.mockReturnValue(of(runOf(['pass', 'pass', 'pass'])));
    const { fixture, httpMock } = render();
    const root: HTMLElement = fixture.nativeElement;
    await tick();
    httpMock.expectOne(`${WORKER_API_URL}practice/latest`).flush({}, { status: 404, statusText: 'none' });
    clickRun(fixture, false);

    if (isComplete) rateAndSave(fixture);
    else buttonByText(root, SAVE_BUTTON)!.click();
    await tick(); // the token arrives before the request
    const req = httpMock.expectOne(`${WORKER_API_URL}practice/save`);
    req.flush({ ok: true });
    await tick();
    fixture.detectChanges();

    expect(headerOf(req.request.body.content)).toMatchObject(expected);
    if (isComplete) expect(root.textContent).toContain('Marked complete · 🟢 · O(n) / O(1)');
  });

  it.each([
    { name: 'in the session, save succeeds', isInSession: true, status: 200, isAdvanced: true },
    { name: 'in the session, save fails', isInSession: true, status: 500, isAdvanced: false },
    { name: 'not in the session, save succeeds', isInSession: false, status: 200, isAdvanced: false },
  ])('Save rep, $name: advances is $isAdvanced', async ({ isInSession, status, isAdvanced }) => {
    signIn(OWNER);
    runSpy.mockReturnValue(of(runOf(['pass', 'pass', 'pass'])));
    const todaySession = { active: () => false, isRunning: () => false, contains: vi.fn(() => isInSession), markCompleted: vi.fn(), advanceFrom: vi.fn() };
    const { fixture, httpMock } = render([{ provide: TodaySessionService, useValue: todaySession }]);
    await tick();
    httpMock.expectOne(`${WORKER_API_URL}practice/latest`).flush({}, { status: 404, statusText: 'none' });
    clickRun(fixture, false);

    rateAndSave(fixture);
    await tick(); // the token arrives before the request
    httpMock.expectOne(`${WORKER_API_URL}practice/save`).flush({ ok: true }, { status, statusText: 'reply' });
    await tick();

    expect(todaySession.markCompleted).toHaveBeenCalledTimes(isAdvanced ? 1 : 0);
    expect(todaySession.advanceFrom).toHaveBeenCalledTimes(isAdvanced ? 1 : 0);
    if (isAdvanced) expect(todaySession.advanceFrom).toHaveBeenCalledWith(90);
  });

  it.each([
    { name: 'a full pass', verdicts: ['pass', 'pass', 'pass'], isSample: false, editBeforeResult: false, isOpen: true },
    { name: 'a partial pass', verdicts: ['pass', 'pass', 'fail'], isSample: false, editBeforeResult: false, isOpen: false },
    { name: 'a pass on stale code', verdicts: ['pass', 'pass', 'pass'], isSample: false, editBeforeResult: true, isOpen: false },
  ] as const)('$name: the complete-rep panel opens is $isOpen', ({ verdicts, isSample, editBeforeResult, isOpen }) => {
    signIn(OWNER);
    const result = new Subject<RunState>();
    runSpy.mockReturnValue(result);
    const { fixture } = render();

    clickRun(fixture, isSample);
    if (editBeforeResult) fixture.componentInstance.onTextChange('changed while running');
    result.next(runOf(verdicts));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-complete-rep-panel') !== null).toBe(isOpen);
  });

  const LEAVE_ROWS: readonly {
    readonly name: string;
    readonly hasPass: boolean;
    readonly isConfirmed: boolean;
    readonly isConfirmAsked: boolean;
    readonly canLeave: boolean;
    readonly isSent: boolean;
  }[] = [
    { name: 'unsaved pass, confirm OK', hasPass: true, isConfirmed: true, isConfirmAsked: true, canLeave: true, isSent: true },
    { name: 'unsaved pass, confirm cancel', hasPass: true, isConfirmed: false, isConfirmAsked: true, canLeave: false, isSent: false },
    { name: 'no pass', hasPass: false, isConfirmed: true, isConfirmAsked: false, canLeave: true, isSent: false },
  ];

  it.each(LEAVE_ROWS)('leaving, $name', async ({ hasPass, isConfirmed, isConfirmAsked, canLeave, isSent }) => {
    signIn(OWNER);
    if (hasPass) runSpy.mockReturnValue(of(runOf(['pass', 'pass', 'pass'])));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(isConfirmed);
    const { fixture, httpMock } = render();
    if (hasPass) clickRun(fixture, false);

    const leaving = fixture.componentInstance.confirmLeave();
    await tick(); // the token arrives before the request
    const saves = httpMock.match(`${WORKER_API_URL}practice/save`);
    saves.forEach((req) => req.flush({ ok: true }));

    expect(await leaving).toBe(canLeave);
    expect(confirmSpy).toHaveBeenCalledTimes(isConfirmAsked ? 1 : 0);
    expect(saves).toHaveLength(isSent ? 1 : 0);
    if (isSent) {
      expect(headerOf(saves[0].request.body.content)).toMatchObject({
        complete: true,
        rating: null,
        tests: '3/3',
        complexity: null,
      });
    }
  });

  it.each([
    {
      name: 'a complete save',
      act: async (fixture: ComponentFixture<PracticePageComponent>, httpMock: HttpTestingController) => {
        rateAndSave(fixture);
        await tick();
        httpMock.expectOne(`${WORKER_API_URL}practice/save`).flush({ ok: true });
      },
    },
    {
      name: 'a provisional save',
      act: async (fixture: ComponentFixture<PracticePageComponent>, httpMock: HttpTestingController) => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const leaving = fixture.componentInstance.confirmLeave();
        await tick();
        httpMock.expectOne(`${WORKER_API_URL}practice/save`).flush({ ok: true });
        await leaving;
      },
    },
  ])('Save to GitHub is hidden after $name', async ({ act }) => {
    signIn(OWNER);
    runSpy.mockReturnValue(of(runOf(['pass', 'pass', 'pass'])));
    const { fixture, httpMock } = render();
    clickRun(fixture, false);
    expect(buttonByText(fixture.nativeElement, SAVE_BUTTON)).toBeDefined();

    await act(fixture, httpMock);
    await tick();
    fixture.detectChanges();

    expect(buttonByText(fixture.nativeElement, SAVE_BUTTON)).toBeUndefined();
  });

  it('owner on a problem with no pick: the editor shows at once and Run is enabled', () => {
    signIn(OWNER);
    const { fixture } = render();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('app-code-editor')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[aria-label="Run"]')!.disabled).toBe(false);
  });

  it.each([
    { name: 'remote newer than the draft: loaded', draftSavedAt: Date.parse(REMOTE_SAVED_AT) - 1, isLoaded: true },
    { name: 'draft newer than the remote: kept', draftSavedAt: Date.parse(REMOTE_SAVED_AT) + 1, isLoaded: false },
  ])('reload, $name', async ({ draftSavedAt, isLoaded }) => {
    signIn(OWNER);
    localStorage.setItem(TABS_KEY, JSON.stringify({ texts: ['my draft'], active: 0, savedAt: draftSavedAt }));
    const { fixture, httpMock } = render();

    await tick(); // the token arrives before the request
    httpMock.expectOne(`${WORKER_API_URL}practice/latest`).flush({ path: 'p.py', content: REMOTE_FILE });
    await tick();
    fixture.detectChanges();

    if (isLoaded) expect(setTextSpy).toHaveBeenCalledWith(REMOTE_CODE);
    else expect(setTextSpy).not.toHaveBeenCalled();
  });
});
