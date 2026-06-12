import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def plusOneSolution1(self, digits: List[int]) -> List[int]:
        # iterate from last number in list
        # if digit is 9, set to 0 and continue
        # otherwise, add 1 and return
        # if we are out of loop without returning, it means it was all 9s
        # thus we add 1 in front of list

        # range(start, end, increment)
        for i in range(len(digits)-1,-1,-1):
            if digits[i] != 9:
                digits[i] += 1
                return digits
            digits[i] = 0

        return [1] + digits`;

function generateSteps(): Step[] {
  const digits = [1, 2, 9];
  const steps: Step[] = [];

  steps.push({
    explanation:
      'Plus One on [1,2,9]: add 1 to the integer represented as an array of digits. Walk from the rightmost digit. If it\'s 9, set it to 0 (carry) and continue left. Otherwise add 1 and return. If all digits were 9, prepend a 1.',
    highlightLine: 8,
    state: {
      type: 'array',
      cells: digits.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'digits', value: '[1,2,9]' }],
  });

  let i = digits.length - 1;

  while (i >= 0) {
    const cur = digits[i];

    steps.push({
      explanation: `i=${i}: digits[${i}]=${cur}. ${cur !== 9 ? `Not 9 → increment to ${cur + 1} and return.` : `It's 9 → set to 0 (carry over), continue left.`}`,
      highlightLine: cur !== 9 ? 10 : 12,
      state: {
        type: 'array',
        cells: digits.map((v, idx) => ({
          value: v,
          state:
            idx === i
              ? ('active' as const)
              : idx > i
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'digits[i]', value: cur, highlight: true },
        { name: 'is 9?', value: cur === 9 ? 'yes → set 0' : 'no → +1 & return' },
      ],
    });

    if (cur !== 9) {
      digits[i] += 1;
      steps.push({
        explanation: `digits[${i}] incremented to ${digits[i]}. Result: [${digits.join(',')}]. Return.`,
        highlightLine: 11,
        state: {
          type: 'array',
          cells: digits.map((v, idx) => ({
            value: v,
            state: ('found' as const),
          })),
          pointers: [],
        },
        variables: [{ name: 'return', value: `[${digits.join(',')}]`, highlight: true }],
      });
      return steps;
    }

    digits[i] = 0;

    steps.push({
      explanation: `Set digits[${i}] = 0. Carry propagates left.`,
      highlightLine: 13,
      state: {
        type: 'array',
        cells: digits.map((v, idx) => ({
          value: v,
          state:
            idx === i
              ? ('visited' as const)
              : idx > i
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: i > 0 ? [{ index: i - 1, label: 'next i' }] : [],
      },
      variables: [
        { name: 'digits[i]', value: 0 },
        { name: 'carry', value: 1, highlight: true },
      ],
    });

    i--;
  }

  // All digits were 9, prepend 1
  const result = [1, ...digits];
  steps.push({
    explanation: `All digits were 9 and set to 0. Prepend 1 → [${result.join(',')}].`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: result.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
    },
    variables: [{ name: 'return', value: `[${result.join(',')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Carry Propagation',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const plusOneMeta: AlgorithmMeta = {
  id: 'plus-one',
  lcNumber: 66,
  title: 'Plus One',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Array', 'Math'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given a large integer represented as an integer array digits, where each digits[i] is the i-th digit of the integer. Increment the large integer by one and return the resulting array of digits.',
  examples: [
    {
      input: 'digits = [1,2,9]',
      output: '[1,3,0]',
      explanation: 'The array represents 129. 129 + 1 = 130.',
    },
    {
      input: 'digits = [9,9,9]',
      output: '[1,0,0,0]',
      explanation: 'The array represents 999. 999 + 1 = 1000 — all 9s roll over and a new leading 1 is prepended.',
    },
    {
      input: 'digits = [1,2,3]',
      output: '[1,2,4]',
      explanation: 'The array represents 123. 123 + 1 = 124.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ digits.length ≤ 100',
    '0 ≤ digits[i] ≤ 9',
    'digits does not contain any leading 0\'s.',
  ],
  hint: 'Walk from the last digit to the first. If digits[i] != 9, just increment it and return immediately. If digits[i] == 9, set it to 0 (carry) and move left. If you exhaust the loop without returning, all digits were 9 — prepend a 1 to the array.',
  solutions: [solution],
};
