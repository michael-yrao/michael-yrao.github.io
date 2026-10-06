import { Component, input, output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { PracticeService } from '../../../core/services/practice.service';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { createSavedProblem, listSavedProblems, loadSavedProblem, SAVED_PROBLEM_KEY_PREFIX } from '../saved-problem-store';
import { TITLE_MAX_LENGTH, type InterviewProblem } from '../session/interview-problem';
import { INTERVIEW_DRAFT_KEY } from './interview-draft';
import {
  AUTOSAVE_DELAY_MS,
  DRAFT_STATUS,
  InterviewPrepareComponent,
  PROBLEM_NOT_FOUND_MESSAGE,
  SAVED_STATUS,
} from './interview-prepare.component';

const MESSAGE = '.practice__message';
const STATUS = '.interview-prepare__status';
const SAVE_BUTTON = 'button.practice__btn--primary';
const SAVED_AT = 1_000;

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
const EDITED: InterviewProblem = { ...PROBLEM, title: 'Edited' };
const OVER_LONG: InterviewProblem = { ...PROBLEM, title: 'x'.repeat(TITLE_MAX_LENGTH + 1) };
const SITE_NUMBER = 1;
const SITE_PROBLEM = {
  number: SITE_NUMBER,
  title: 'Two Sum',
  url: null,
  statement: 'Find two numbers.',
  stub: 'class Solution:\n    pass\n',
  entry: { className: 'Solution', method: 'twoSum' },
  compare: 'exact',
  result: null,
  types: null,
  figure: null,
  cases: [],
} as unknown as PracticeProblem;

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

function setUp(query: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [InterviewPrepareComponent],
    providers: [
      provideRouter([]),
      { provide: PracticeService, useValue: { data: signal({ schemaVersion: 1, generatedAt: '', problems: [SITE_PROBLEM] }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
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
  const text = (selector: string): string | null => root.querySelector(selector)?.textContent?.trim() ?? null;
  return { fixture, root, editor, navigate, text };
}

/** Saves `problem` as a saved problem and returns its id. */
function savedId(problem: InterviewProblem): string {
  const id = createSavedProblem(problem, SAVED_AT);
  if (id === null) throw new Error('could not save');
  return id;
}

function clearStorage(): void {
  localStorage.removeItem(INTERVIEW_DRAFT_KEY);
  listSavedProblems().forEach(({ id }) => localStorage.removeItem(`${SAVED_PROBLEM_KEY_PREFIX}${id}`));
}

describe('InterviewPrepareComponent', () => {
  beforeEach(clearStorage);
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearStorage();
  });

  it.each([
    { name: 'a known number fills the New draft', param: String(SITE_NUMBER), isFilled: true },
    { name: 'an unknown number leaves the draft', param: '999999', isFilled: false },
    { name: 'a non-number leaves the draft', param: 'abc', isFilled: false },
  ])('?import=: $name and the parameter is removed', ({ param, isFilled }) => {
    const { fixture, editor, navigate } = setUp({ import: param });
    fixture.detectChanges();

    if (isFilled) {
      expect(editor().problem().title).toBe(SITE_PROBLEM.title);
      expect(editor().problem().starter).toBe(SITE_PROBLEM.stub);
    } else {
      expect(editor().problem().title).not.toBe(SITE_PROBLEM.title);
    }
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { import: null }, queryParamsHandling: 'merge', replaceUrl: true }));
  });

  it.each([
    { name: 'a known id loads the problem and autosaves', isKnown: true, title: SAVED.title, status: SAVED_STATUS, message: null },
    { name: 'an unknown id says so, drops the parameter and stays on the draft', isKnown: false, title: PROBLEM.title, status: DRAFT_STATUS, message: PROBLEM_NOT_FOUND_MESSAGE },
  ])('?problem=: $name', ({ isKnown, title, status, message }) => {
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(PROBLEM));
    const id = isKnown ? savedId(SAVED) : 'no-such-problem';
    const { editor, navigate, text } = setUp({ problem: id });

    expect({ title: editor().problem().title, status: text(STATUS), message: text(MESSAGE) }).toEqual({ title, status, message });
    if (isKnown) {
      expect(navigate).not.toHaveBeenCalled();
    } else {
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { problem: null }, queryParamsHandling: 'merge', replaceUrl: true }));
    }
  });

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers());

    it.each<{ name: string; isSaved: boolean; expected: { draft: string | null; savedTitle: string | null } }>([
      { name: 'on the draft an edit lands in the draft key', isSaved: false, expected: { draft: EDITED.title, savedTitle: null } },
      { name: 'on a saved problem an edit lands in the saved problem', isSaved: true, expected: { draft: null, savedTitle: EDITED.title } },
    ])('autosave: $name', ({ isSaved, expected }) => {
      const id = isSaved ? savedId(SAVED) : null;
      const { editor } = setUp(id === null ? {} : { problem: id });

      editor().problemChange.emit(EDITED);
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);

      const draft = localStorage.getItem(INTERVIEW_DRAFT_KEY);
      expect({
        draft: draft === null ? null : JSON.parse(draft).title,
        savedTitle: id === null ? null : (loadSavedProblem(id)?.problem.title ?? null),
      }).toEqual(expected);
    });

    it.each<{ name: string; start: 'draft' | 'saved' | 'rejected'; expected: { saved: number; isDraftKept: boolean; navigatesTo: string | null; title: string | null } }>([
      { name: 'the draft becomes a saved problem, the draft is cleared and the url gains the id', start: 'draft', expected: { saved: 1, isDraftKept: false, navigatesTo: 'new', title: EDITED.title } },
      { name: 'a saved problem is updated in place with no navigation', start: 'saved', expected: { saved: 1, isDraftKept: false, navigatesTo: null, title: EDITED.title } },
      { name: 'a rejected form saves nothing', start: 'rejected', expected: { saved: 0, isDraftKept: false, navigatesTo: null, title: null } },
    ])('Save: $name', ({ start, expected }) => {
      const existing = start === 'saved' ? savedId(SAVED) : null;
      if (start === 'draft') localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(PROBLEM));
      const { fixture, root, editor, navigate } = setUp(existing === null ? {} : { problem: existing });

      editor().problemChange.emit(start === 'rejected' ? OVER_LONG : EDITED);
      root.querySelector<HTMLButtonElement>(SAVE_BUTTON)!.click();
      fixture.detectChanges();

      const list = listSavedProblems();
      const id = existing ?? list[0]?.id ?? null;
      expect({
        saved: list.length,
        isDraftKept: localStorage.getItem(INTERVIEW_DRAFT_KEY) !== null,
        navigatesTo: navigate.mock.calls.length === 0 ? null : 'new',
        title: id === null ? null : (loadSavedProblem(id)?.problem.title ?? null),
      }).toEqual(expected);
      if (expected.navigatesTo !== null) {
        expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { problem: id }, queryParamsHandling: 'merge', replaceUrl: true }));
      }
    });
  });
});
