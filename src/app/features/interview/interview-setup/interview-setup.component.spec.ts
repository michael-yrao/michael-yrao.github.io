import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { formatCode } from '../directory/interview-code';
import { INTERVIEW_REFUSED_MESSAGE } from '../interview-messages';
import type { InterviewProblem } from '../session/interview-problem';
import { PreparedInterviewsService } from '../session/prepared-interviews.service';
import type { PreparedCodes, PreparedSummary } from '../session/prepared-summary';
import { InterviewSetupComponent } from './interview-setup.component';
import { SETUP_ERROR_TEXT } from './setup-form';

const PROBLEM_ID = 'problem-1';
const SESSION_ID = 'session-1';
const CANDIDATE_CODE = 'ABCD2345';
const INTERVIEWER_CODE = 'WXYZ6789';

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

const CODES: PreparedCodes = {
  candidateCode: CANDIDATE_CODE,
  interviewerCode: INTERVIEWER_CODE,
  candidateUrl: `https://example.com/interview?code=${CANDIDATE_CODE}`,
  interviewerUrl: `https://example.com/interview?code=${INTERVIEWER_CODE}`,
};

const SUMMARY: PreparedSummary = { sessionId: SESSION_ID, title: PROBLEM.title, createdAt: 0, publish: 'published', schedule: null };

/** Lets every pending promise settle (real timers only). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function setUp(prepareResult: string | null) {
  const prepared = {
    prepare: vi.fn().mockResolvedValue(prepareResult),
    list: signal<readonly PreparedSummary[]>([SUMMARY]),
    codesOf: vi.fn(() => CODES),
  };
  TestBed.configureTestingModule({ providers: [{ provide: PreparedInterviewsService, useValue: prepared }] });
  const fixture = TestBed.createComponent(InterviewSetupComponent);
  fixture.componentRef.setInput('problemId', PROBLEM_ID);
  fixture.componentRef.setInput('problem', PROBLEM);
  fixture.detectChanges();
  return { fixture, prepared, root: fixture.nativeElement as HTMLElement };
}

async function submit(setup: ReturnType<typeof setUp>, candidateName: string): Promise<string> {
  const name = setup.root.querySelector<HTMLInputElement>('input[name="candidateName"]')!;
  name.value = candidateName;
  setup.root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flush();
  setup.fixture.detectChanges();
  return setup.root.textContent ?? '';
}

const CASES: readonly {
  readonly name: string;
  readonly prepareResult: string | null;
  readonly candidateName: string;
  readonly isPrepared: boolean;
  readonly shown: readonly string[];
}[] = [
  {
    name: 'an invalid form shows its error and prepares nothing',
    prepareResult: SESSION_ID,
    candidateName: '',
    isPrepared: false,
    shown: [SETUP_ERROR_TEXT['candidate-name-missing']],
  },
  {
    name: 'a valid form prepares the interview and shows both codes',
    prepareResult: SESSION_ID,
    candidateName: 'Sam',
    isPrepared: true,
    shown: ['Interview set up for Sam', formatCode(CANDIDATE_CODE), formatCode(INTERVIEWER_CODE)],
  },
  {
    name: 'a refused save shows the refusal',
    prepareResult: null,
    candidateName: 'Sam',
    isPrepared: true,
    shown: [INTERVIEW_REFUSED_MESSAGE],
  },
];

describe('InterviewSetupComponent submit', () => {
  it.each(CASES)('$name', async ({ prepareResult, candidateName, isPrepared, shown }) => {
    const setup = setUp(prepareResult);

    const text = await submit(setup, candidateName);

    for (const expected of shown) {
      expect(text).toContain(expected);
    }
    if (isPrepared) {
      expect(setup.prepared.prepare).toHaveBeenCalledWith(PROBLEM, expect.objectContaining({ problemId: PROBLEM_ID, candidateName }));
    } else {
      expect(setup.prepared.prepare).not.toHaveBeenCalled();
    }
  });
});
