import { CUSTOM_PROBLEM } from './session-message';
import { sessionPageUrl } from './session-support';

const PAGE_URL = 'https://site.test/practice/3?join=abc';

const CASES: readonly { name: string; problem: number; expected: string }[] = [
  { name: 'a numbered problem', problem: 7, expected: 'https://site.test/practice/7?join=abc' },
  { name: 'the custom problem', problem: CUSTOM_PROBLEM, expected: 'https://site.test/practice/custom?join=abc' },
];

describe('sessionPageUrl', () => {
  it.each(CASES)('$name points the page at the session problem and keeps the query', ({ problem, expected }) => {
    expect(sessionPageUrl(PAGE_URL, problem)).toBe(expected);
  });
});
