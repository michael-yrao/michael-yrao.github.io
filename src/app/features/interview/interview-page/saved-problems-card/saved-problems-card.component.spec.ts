import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { createSavedProblem, listSavedProblems } from '../../saved-problem-store';
import type { InterviewProblem } from '../../session/interview-problem';
import { SavedProblemsCardComponent } from './saved-problems-card.component';

const DELETE_BUTTON = 'button[aria-label="Delete saved problem"]';
const ROW = '.saved-problems__row';

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

const CASES: readonly { readonly name: string; readonly isConfirmed: boolean; readonly rowsAfter: number; readonly storedAfter: number }[] = [
  { name: 'declining the confirm keeps the row', isConfirmed: false, rowsAfter: 1, storedAfter: 1 },
  { name: 'accepting the confirm removes the row and the stored problem', isConfirmed: true, rowsAfter: 0, storedAfter: 0 },
];

describe('SavedProblemsCardComponent delete', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(CASES)('$name', ({ isConfirmed, rowsAfter, storedAfter }) => {
    createSavedProblem(PROBLEM, Date.now());
    vi.spyOn(window, 'confirm').mockReturnValue(isConfirmed);
    const fixture = TestBed.createComponent(SavedProblemsCardComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    root.querySelector<HTMLButtonElement>(DELETE_BUTTON)!.click();
    fixture.detectChanges();

    expect(root.querySelectorAll(ROW)).toHaveLength(rowsAfter);
    expect(listSavedProblems()).toHaveLength(storedAfter);
  });
});
