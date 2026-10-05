import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InterviewProblem } from '../session/interview-problem';
import { TITLE_MAX_LENGTH } from '../session/interview-problem';
import { EMPTY_PROBLEM, loadInterviewDraft, parseDraft, saveInterviewDraft } from './interview-draft';

const SAVED: InterviewProblem = {
  title: 'Two Sum',
  statement: 'Find two numbers.',
  starter: 'class Solution:\n    def twoSum(self, nums):\n        pass\n',
  entry: { className: 'Solution', method: 'twoSum' },
  compare: 'unordered',
  cases: [{ args: [[2, 7], 9], expected: [0, 1], example: true }],
  result: null,
  types: null,
  figure: null,
  source: 1,
};

describe('parseDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['absent', () => null],
    ['malformed JSON', () => '{"title":'],
    ['over its cap', () => JSON.stringify({ ...SAVED, title: 'x'.repeat(TITLE_MAX_LENGTH + 1) })],
  ])('reads %s as the empty problem', (_name, raw) => {
    expect(parseDraft(raw())).toEqual(EMPTY_PROBLEM);
  });

  it('reads back what was saved', () => {
    saveInterviewDraft(SAVED);

    expect(loadInterviewDraft()).toEqual(SAVED);
  });
});
