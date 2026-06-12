import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def isValid(self, s: str) -> bool:
        # basically a bunch of if else statements
        # we can insert into stack on opening bracket
        # pop on ending if it matches, return False if not match
        # so one thing we can do is just do an open to close map

        openToCloseMap = {'(' : ')', '{' : '}', '[' : ']'}

        stack = deque()

        for char in s:
            # check first if it is a closing bracket
            if char in openToCloseMap.values():
                # if stack is empty and we see an closing bracket, return false
                # if map[peek] != char, also return false
                if not stack or openToCloseMap.get(stack[-1],None) != char:
                    return False
                # otherwise we got a match, pop out opening bracket
                stack.pop()
            if char in openToCloseMap:
                stack.append(char)
        return not stack`;

const PYTHON_CODE_ALT = `class Solution:
    def isValidSet(self, s: str) -> bool:
        # basically a bunch of if else statements
        # we can insert into stack on opening bracket
        # pop on ending if it matches, return False if not match
        # so one thing we can do is just do an open to close map

        openToCloseMap = {'(' : ')', '{' : '}', '[' : ']'}

        closeBrackets = set(openToCloseMap.values())

        stack = deque()

        for char in s:
            # check first if it is a closing bracket
            if char in closeBrackets:
                # if stack is empty and we see an closing bracket, return false
                # if map[peek] != char, also return false
                if not stack or openToCloseMap.get(stack[-1],None) != char:
                    return False
                # otherwise we got a match, pop out opening bracket
                stack.pop()
            if char in openToCloseMap:
                stack.append(char)
        return not stack`;

function generateSteps(): Step[] {
  const s = '([{}])';
  const steps: Step[] = [];
  const openToClose: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closeSet = new Set([')', ']', '}']);
  const stack: string[] = [];

  steps.push({
    explanation: `Input: "${s}". A stack is perfect here because brackets must be closed in LIFO order — the most recently opened bracket must be the next one closed. We map each opener to its expected closer.`,
    highlightLine: 11,
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

    if (isOpen) {
      steps.push({
        explanation: `'${char}' is an opening bracket. Push it onto the stack. We'll match it when we see its partner '${openToClose[char]}'. Stack is LIFO — last in, first out.`,
        highlightLine: 25,
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
    } else if (isClose) {
      const topOfStack = stack[stack.length - 1];
      const expected = topOfStack ? openToClose[topOfStack] : null;
      const matches = expected === char;

      if (matches) {
        steps.push({
          explanation: `'${char}' is a closing bracket. Top of stack is '${topOfStack}', whose expected closer is '${expected}'. They match! Pop '${topOfStack}' off the stack.`,
          highlightLine: 23,
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
          explanation: `'${char}' is a closing bracket but ${topOfStack ? `top of stack '${topOfStack}' expects '${expected}', not '${char}'` : 'the stack is empty'}. Mismatch — return false.`,
          highlightLine: 21,
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
  }

  steps.push({
    explanation: `All characters processed. Stack is ${stack.length === 0 ? 'empty — every opener was matched' : 'not empty — some openers were never closed'}. Return ${stack.length === 0}.`,
    highlightLine: 26,
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
  return [];
}

const stackSolution: SolutionVariant = {
  label: 'Stack',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

const stackSetSolution: SolutionVariant = {
  label: 'Stack + Set',
  pythonCode: PYTHON_CODE_ALT,
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
