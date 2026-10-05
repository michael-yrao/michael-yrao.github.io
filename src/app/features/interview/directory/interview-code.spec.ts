import { CODE_LENGTH, CodeRole, InterviewCode, codeUrl, formatCode, generateCode, normalizeCode } from './interview-code';

const CANDIDATE: InterviewCode = { role: 'candidate', code: 'K7QF2M9X' };
const INTERVIEWER: InterviewCode = { role: 'interviewer', code: '4TPD8HNW3RXA' };

describe('normalizeCode', () => {
  it.each<{ name: string; input: string; expected: InterviewCode | null }>([
    { name: 'a canonical 8-character code is the candidate', input: 'K7QF2M9X', expected: CANDIDATE },
    { name: 'a canonical 12-character code is the interviewer', input: '4TPD8HNW3RXA', expected: INTERVIEWER },
    { name: 'lower case', input: 'k7qf2m9x', expected: CANDIDATE },
    { name: 'hyphens', input: '4TPD-8HNW-3RXA', expected: INTERVIEWER },
    { name: 'spaces around and inside', input: ' k7qf 2m9x ', expected: CANDIDATE },
    { name: 'O reads as 0, I and L as 1', input: 'oIl0-1Z8X', expected: { role: 'candidate', code: '01101Z8X' } },
    { name: 'U is rejected', input: 'K7QFU2M9', expected: null },
    { name: 'another character is rejected', input: 'K7QF2M9!', expected: null },
    { name: 'empty', input: '', expected: null },
    { name: 'seven characters', input: 'K7QF2M9', expected: null },
    { name: 'nine characters', input: 'K7QF2M9XA', expected: null },
    { name: 'eleven characters', input: '4TPD8HNW3RX', expected: null },
    { name: 'thirteen characters', input: '4TPD8HNW3RXAB', expected: null },
  ])('$name', ({ input, expected }) => {
    expect(normalizeCode(input)).toEqual(expected);
  });
});

describe('generateCode and formatCode', () => {
  it.each<CodeRole>(['candidate', 'interviewer'])('a generated %s code survives format then normalize', (role) => {
    const code = generateCode(role);

    expect(code).toHaveLength(CODE_LENGTH[role]);
    expect(normalizeCode(formatCode(code))).toEqual({ role, code });
  });

  it('groups of four are joined by hyphens', () => {
    expect(formatCode('4TPD8HNW3RXA')).toBe('4TPD-8HNW-3RXA');
  });
});

describe('codeUrl', () => {
  it.each([
    { name: 'drops host, join and the fragment, keeps the rest', page: 'https://site.test/interview?host=h&join=j&x=1#p=z', expected: 'https://site.test/interview?x=1&code=K7QF-2M9X' },
    { name: 'moves another page onto /interview', page: 'https://site.test/interview/prepare', expected: 'https://site.test/interview?code=K7QF-2M9X' },
  ])('$name', ({ page, expected }) => {
    expect(codeUrl(page, 'K7QF2M9X')).toBe(expected);
  });
});
