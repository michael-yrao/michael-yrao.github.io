import { Component, input, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import type { InterviewProblem } from '../session/interview-problem';
import { InterviewSessionService } from '../session/interview-session.service';
import { PreparedInterviewsService, type PreparedDetail, type PreparedSummary } from '../session/prepared-interviews.service';
import { OFFLINE_MESSAGE } from './prepared-picker';
import { INTERVIEW_DRAFT_KEY } from './interview-draft';
import { InterviewPrepareComponent } from './interview-prepare.component';

const DELETE_BUTTON = '.interview-prepare__delete';
const MESSAGE = '.practice__message';
const SELECT = '.interview-prepare__prepared select';
const PREPARE_BUTTON = 'button.practice__btn--primary';
const SAVED_ID = 'p1';
const LIVE_ID = 'p2';
const NEW_ID = 'p-new';
const NEW_VALUE = '';

const PROBLEM: InterviewProblem = {
  title: 'Draft',
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
const SAVED: InterviewProblem = { ...PROBLEM, title: 'Saved' };

@Component({
  selector: 'app-problem-editor',
  template: '<ng-content select="[problemEditorHead]" /><ng-content />',
  providers: [{ provide: ProblemEditorComponent, useExisting: StubProblemEditorComponent }],
})
class StubProblemEditorComponent {
  readonly problem = input.required<InterviewProblem>();
  readonly problemChange = output<InterviewProblem>();
  readonly isRejected = input(false);
  readonly isSplit = input(false);
}

const summary = (sessionId: string, title: string): PreparedSummary => ({ sessionId, title, createdAt: 0, publish: 'local' });

/** A stand-in for the prepared-interview store: two entries, `SAVED_ID` and `LIVE_ID`. */
function fakePrepared() {
  return {
    list: signal<readonly PreparedSummary[]>([summary(SAVED_ID, SAVED.title), summary(LIVE_ID, 'Live')]),
    detail: vi.fn((sessionId: string): Promise<PreparedDetail> =>
      Promise.resolve({ sessionId, problem: SAVED, rev: 1, candidateCode: '', interviewerCode: '', candidateUrl: '', interviewerUrl: '', publish: 'local' }),
    ),
    prepare: vi.fn().mockResolvedValue(NEW_ID),
    update: vi.fn().mockResolvedValue(true),
    flush: vi.fn().mockResolvedValue(undefined),
    retryUnpublished: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(true),
    packedOf: vi.fn((sessionId: string) => `packed-${sessionId}`),
  };
}

function fakeSession() {
  return {
    linkParams: signal<Record<string, string>>({}),
    resume: vi.fn().mockResolvedValue(undefined),
    join: vi.fn().mockResolvedValue(undefined),
  };
}

/** Lets every pending promise settle (real timers only). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function setUp() {
  const prepared = fakePrepared();
  const session = fakeSession();
  TestBed.configureTestingModule({
    imports: [InterviewPrepareComponent],
    providers: [
      provideRouter([]),
      { provide: InterviewSessionService, useValue: session },
      { provide: PreparedInterviewsService, useValue: prepared },
    ],
  });
  TestBed.overrideComponent(InterviewPrepareComponent, {
    remove: { imports: [ProblemEditorComponent] },
    add: { imports: [StubProblemEditorComponent] },
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(InterviewPrepareComponent);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  const editor = (): StubProblemEditorComponent => fixture.debugElement.query(By.directive(StubProblemEditorComponent)).componentInstance;
  return { fixture, root, editor, prepared, session, navigate };
}

describe('InterviewPrepareComponent', () => {
  beforeEach(() => localStorage.removeItem(INTERVIEW_DRAFT_KEY));
  afterEach(() => localStorage.removeItem(INTERVIEW_DRAFT_KEY));

  it('picking an entry loads its problem into the form and never opens an interview', async () => {
    const { fixture, root, editor, prepared, session } = setUp();
    const select = root.querySelector<HTMLSelectElement>(SELECT)!;

    select.value = SAVED_ID;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    expect(prepared.detail).toHaveBeenCalledWith(SAVED_ID, expect.any(String));
    expect(editor().problem()).toEqual(SAVED);
    expect(session.resume).not.toHaveBeenCalled();
    expect(session.join).not.toHaveBeenCalled();
  });

  it('Prepare stays on the page: it selects the new entry, with no navigation and no interview', async () => {
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(PROBLEM));
    const { fixture, root, prepared, session, navigate } = setUp();
    prepared.list.update((items) => [...items, summary(NEW_ID, PROBLEM.title)]);
    fixture.detectChanges();

    root.querySelector<HTMLButtonElement>(PREPARE_BUTTON)!.click();
    await flush();
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    expect(prepared.prepare).toHaveBeenCalledExactlyOnceWith(PROBLEM);
    expect(prepared.detail).toHaveBeenCalledWith(NEW_ID, expect.any(String));
    expect(root.querySelector<HTMLSelectElement>(SELECT)!.value).toBe(NEW_ID);
    expect(navigate).not.toHaveBeenCalled();
    expect(session.resume).not.toHaveBeenCalled();
    expect(session.join).not.toHaveBeenCalled();
  });

  it('the entry that is live in this tab is disabled in the picker', () => {
    const { fixture, root, session } = setUp();
    session.linkParams.set({ host: `packed-${LIVE_ID}` });
    fixture.detectChanges();

    const disabled = Array.from(root.querySelectorAll<HTMLOptionElement>(`${SELECT} option`)).map((option) => [option.value, option.disabled]);

    expect(disabled).toEqual([
      [NEW_VALUE, false],
      [SAVED_ID, false],
      [LIVE_ID, true],
    ]);
  });

  it.each<{ name: string; isConfirmed: boolean; removeResult: boolean; expected: { removes: number; selected: string; message: string | null; form: InterviewProblem } }>([
    { name: 'a declined confirm calls nothing and keeps the selection', isConfirmed: false, removeResult: true, expected: { removes: 0, selected: SAVED_ID, message: null, form: SAVED } },
    { name: 'a removed entry returns to New with the draft', isConfirmed: true, removeResult: true, expected: { removes: 1, selected: NEW_VALUE, message: null, form: PROBLEM } },
    { name: 'a server that cannot be reached keeps the entry and says so', isConfirmed: true, removeResult: false, expected: { removes: 1, selected: SAVED_ID, message: OFFLINE_MESSAGE, form: SAVED } },
  ])('Delete: $name', async ({ isConfirmed, removeResult, expected }) => {
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(PROBLEM));
    vi.spyOn(window, 'confirm').mockReturnValue(isConfirmed);
    const { fixture, root, editor, prepared } = setUp();
    prepared.remove.mockResolvedValue(removeResult);
    const select = root.querySelector<HTMLSelectElement>(SELECT)!;
    select.value = SAVED_ID;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();

    root.querySelector<HTMLButtonElement>(DELETE_BUTTON)!.click();
    await flush();
    fixture.detectChanges();

    expect({
      removes: prepared.remove.mock.calls.length,
      selected: root.querySelector<HTMLSelectElement>(SELECT)!.value,
      message: root.querySelector(MESSAGE)?.textContent?.trim() ?? null,
      form: editor().problem(),
    }).toEqual(expected);
  });
});
