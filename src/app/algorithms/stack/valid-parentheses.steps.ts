import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Stack (close → open map) ─────────────────────────────────────
//
// Traces cse-progress's isValid_20260808 verbatim — a DIFFERENT shape than the
// "Stack + Set" variant below: bracketMap maps CLOSE → OPEN (not open → close),
// and the branch is `if char not in bracketMap: push` / `else: pop and
// compare`. There is no separate open-bracket membership check — anything not
// a key of bracketMap is assumed to be an opener and pushed. Final check is
// `return len(stack) == 0`.

function generateSteps(): Step[] {
  const s = '([{}])';
  const steps: Step[] = [];
  const bracketMap: Record<string, string> = { '}': '{', ']': '[', ')': '(' };
  const stack: string[] = [];

  steps.push({
    explanation:
      `Input: "${s}". bracketMap maps each CLOSING bracket to the opener it must match: {'}':'{', ']':'[', ')':'('}. For each char: if it's NOT a key of bracketMap, it's an opener — push it. If it IS a key, it's a closer — pop and compare against bracketMap[char].`,
    anchor: { match: "bracketMap = {'}':'{', ']':'[', ')':'('}", to: { match: 'stack = []' } },
    state: {
      type: 'array',
      cells: s.split('').map((c) => ({ value: c, state: 'default' })),
      pointers: [],
      stackItems: [],
    },
    variables: [{ name: 'stack', value: '[]' }],
  });

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    const isCloser = char in bracketMap;

    const cells = s.split('').map((c, idx) => ({
      value: c,
      state: idx === i ? ('active' as const) : idx < i ? ('visited' as const) : ('default' as const),
    }));

    if (!isCloser) {
      steps.push({
        explanation: `'${char}' not in bracketMap → it's an opener. stack.append('${char}').`,
        anchor: { match: 'if char not in bracketMap:', to: { match: 'stack.append(char)' } },
        state: {
          type: 'array',
          cells,
          pointers: [{ index: i, label: 'i' }],
          stackItems: [...stack, char],
        },
        variables: [
          { name: 'char', value: char, highlight: true },
          { name: 'stack[-1]', value: char, highlight: true },
        ],
      });
      stack.push(char);
      continue;
    }

    // isCloser: this fixed example never hits an empty stack here, so only
    // the pop-and-compare path (always a match) is ever actually traced.
    const prevNode = stack.pop()!;
    steps.push({
      explanation: `'${char}' in bracketMap → it's a closer. prevNode = stack.pop() = '${prevNode}'. bracketMap['${char}'] = '${bracketMap[char]}' == prevNode → match, keep going.`,
      anchor: { match: 'prevNode = stack.pop()', to: { match: 'if bracketMap[char] != prevNode:' } },
      state: {
        type: 'array',
        cells: cells.map((c, idx) => ({ ...c, state: idx === i ? ('found' as const) : c.state })),
        pointers: [{ index: i, label: 'i' }],
        stackItems: [...stack],
      },
      variables: [
        { name: 'char', value: char, highlight: true },
        { name: 'prevNode', value: prevNode },
        { name: 'bracketMap[char]', value: bracketMap[char] },
        { name: 'match', value: 'yes', highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `All characters processed. len(stack) == 0 is ${stack.length === 0}. Return ${stack.length === 0}.`,
    anchor: { match: 'return len(stack) == 0' },
    state: {
      type: 'array',
      cells: s.split('').map((c) => ({ value: c, state: 'visited' })),
      pointers: [],
      stackItems: [...stack],
      counters: [{ label: 'result', value: stack.length === 0 ? 'true' : 'false' }],
    },
    variables: [
      { name: 'stack', value: stack.length === 0 ? 'empty' : `[${stack.join(', ')}]` },
      { name: 'result', value: String(stack.length === 0), highlight: true },
    ],
  });

  return steps;
}

// ── Solution 2: Stack + Set (open → close map) ───────────────────────────────
//
// Traces cse-progress's isValidSet verbatim: openToCloseMap (open → close),
// closeBrackets = set(openToCloseMap.values()) precomputed once, and TWO
// separate `if` checks per char (not if/elif) — a char could in principle hit
// neither, though every bracket here hits exactly one.

interface ParenAnchor {
  intro: StepAnchor;
  push: StepAnchor;
  pop: StepAnchor;
  mismatch: StepAnchor;
  final: StepAnchor;
}

function buildParenSteps(intro: string, A: ParenAnchor): Step[] {
  const s = '([{}])';
  const steps: Step[] = [];
  const openToClose: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closeSet = new Set([')', ']', '}']);
  const stack: string[] = [];

  steps.push({
    explanation: intro,
    anchor: A.intro,
    state: {
      type: 'array',
      cells: s.split('').map((c) => ({ value: c, state: 'default' })),
      pointers: [],
      stackItems: [],
    },
    variables: [
      { name: 'stack', value: '[]' },
    ],
  });

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    const isClose = closeSet.has(char);
    const isOpen = char in openToClose;

    const cells = s.split('').map((c, idx) => ({
      value: c,
      state: idx === i ? ('active' as const) : idx < i ? ('visited' as const) : ('default' as const),
    }));

    if (isClose) {
      const topOfStack = stack[stack.length - 1];
      const expected = topOfStack ? openToClose[topOfStack] : null;
      const matches = expected === char;

      if (matches) {
        steps.push({
          explanation: `'${char}' is in closeBrackets. Top of stack is '${topOfStack}', whose expected closer is '${expected}'. They match! Pop '${topOfStack}' off the stack.`,
          anchor: A.pop,
          state: {
            type: 'array',
            cells: cells.map((c, idx) => ({
              ...c,
              state: idx === i ? ('found' as const) : c.state,
            })),
            pointers: [{ index: i, label: 'i' }],
            stackItems: [...stack],
          },
          variables: [
            { name: 'char', value: char, highlight: true },
            { name: 'stack[-1]', value: topOfStack },
            { name: 'match', value: 'yes', highlight: true },
            { name: 'len(stack)', value: stack.length - 1 },
          ],
        });
        stack.pop();
      } else {
        steps.push({
          explanation: `'${char}' is in closeBrackets but ${topOfStack ? `top of stack '${topOfStack}' expects '${expected}', not '${char}'` : 'the stack is empty'}. Mismatch — return false.`,
          anchor: A.mismatch,
          state: {
            type: 'array',
            cells: cells.map((c, idx) => ({
              ...c,
              state: idx === i ? ('eliminated' as const) : c.state,
            })),
            pointers: [{ index: i, label: 'i' }],
            stackItems: [...stack],
          },
          variables: [
            { name: 'char', value: char, highlight: true },
            { name: 'stack[-1]', value: topOfStack ?? 'empty', highlight: true },
            { name: 'match', value: 'no', highlight: true },
            { name: 'result', value: 'false', highlight: true },
          ],
        });
        break;
      }
    }
    // Note: '}' / ']' / ')' are only closers, but in this nested example the
    // same character is never both; openers fall straight through to here.
    if (isOpen) {
      steps.push({
        explanation: `'${char}' is in openToCloseMap. Push it onto the stack. We'll match it when we see its partner '${openToClose[char]}'. Stack is LIFO — last in, first out.`,
        anchor: A.push,
        state: {
          type: 'array',
          cells,
          pointers: [{ index: i, label: 'i' }],
          stackItems: [...stack, char],
        },
        variables: [
          { name: 'char', value: char, highlight: true },
          { name: 'openToCloseMap[char]', value: openToClose[char] },
          { name: 'stack[-1]', value: char, highlight: true },
        ],
      });
      stack.push(char);
    }
  }

  steps.push({
    explanation: `All characters processed. Stack is ${stack.length === 0 ? 'empty — every opener was matched' : 'not empty — some openers were never closed'}. Return ${stack.length === 0}.`,
    anchor: A.final,
    state: {
      type: 'array',
      cells: s.split('').map((c) => ({ value: c, state: 'visited' })),
      pointers: [],
      stackItems: [...stack],
      counters: [{ label: 'result', value: stack.length === 0 ? 'true' : 'false' }],
    },
    variables: [
      { name: 'stack', value: stack.length === 0 ? 'empty' : `[${stack.join(', ')}]` },
      { name: 'result', value: String(stack.length === 0), highlight: true },
    ],
  });

  return steps;
}

function generateSetSteps(): Step[] {
  return buildParenSteps(
    `Input: "([{}])". openToCloseMap maps each OPENING bracket to its closer. closeBrackets = set(openToCloseMap.values()) is precomputed once so "is this char a closing bracket?" is an O(1) set lookup instead of scanning .values() on every char.`,
    {
      intro: { match: 'openToCloseMap = {' + "'(' : ')', '{' : '}', '[' : ']'}", to: { match: 'closeBrackets = set(openToCloseMap.values())' } },
      push: { match: 'stack.append(char)' },
      pop: { match: 'if char in closeBrackets:', to: { match: 'stack.pop()' } },
      // nth:2 skips the banner comment "# pop on ending if it matches, return False if not match" (hit 1).
      mismatch: { match: 'if char in closeBrackets:', to: { match: 'return False', nth: 2 } },
      final: { match: 'return not stack' },
    },
  );
}

const stackSolution: SolutionVariant = {
  label: 'Stack',
  variant: 'stack',
  generateSteps,
};

const stackSetSolution: SolutionVariant = {
  label: 'Stack + Set',
  variant: 'stack-set',
  generateSteps: generateSetSteps,
};

export const validParenthesesMeta: AlgorithmMeta = {
  id: 'valid-parentheses',
  lcNumber: 20,
  title: 'Valid Parentheses',
  difficulty: 'Easy',
  category: 'stack',
  tags: ['Stack', 'String'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given a string s containing only the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the string is valid. A string is valid if every open bracket is closed by the same bracket type, in the correct order.',
  examples: [
    { input: 's = "()"',     output: 'true' },
    { input: 's = "()[]{}"', output: 'true' },
    { input: 's = "([{}])"', output: 'true', explanation: 'Properly nested' },
    { input: 's = "(]"',     output: 'false', explanation: 'Wrong closing bracket type' },
  ] as ProblemExample[],
  constraints: ['1 ≤ s.length ≤ 10⁴', 's consists of parentheses only: \'()[]{}\'' ],
  hint: 'When you see a closing bracket, what\'s the only opening bracket it could match? What data structure remembers the "most recent unmatched opener"?',
  solutions: [stackSolution, stackSetSolution],
};
