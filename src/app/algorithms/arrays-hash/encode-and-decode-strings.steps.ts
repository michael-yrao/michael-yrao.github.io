import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution: Length Prefix (two-pointer decode) ─────────────────────────────
//
// Traces cse-progress's Solution_20260802 verbatim (a whole dated class, no
// separate `class Solution` line). Encode builds a LIST of parts — three
// separate `result.append(...)` calls per string (length, "#", string) — then
// joins with "".join(result), rather than concatenating one string in place.
// Decode's inner scan starts at `j = i + 1` (not `j = i`) before checking for
// '#'.

const STRS = ['Hello', 'World'];

function generateSteps(): Step[] {
  const steps: Step[] = [];

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'The hard part is separating strings when any character (including "#" or digits) may appear inside them. Solution: length-prefix framing. encode builds result as a LIST of parts (length, "#", string) per string, then joins them. decode reads the number, then takes exactly that many characters — a "#" inside the body can never confuse us.',
    anchor: { match: 'for string in strs:' },
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      arrayLabel: 'encoded string',
    },
    variables: [
      { name: 'strs', value: '["Hello", "World"]' },
      { name: 'result', value: '[]' },
    ],
  });

  // ── Encode: one step per string in strs — 3 appends each ────────────────────
  let encoded = '';
  for (const str of STRS) {
    const lenString = str.length;
    const before = encoded.length;
    encoded += `${lenString}#${str}`;
    steps.push({
      explanation: `Encode "${str}": lenString = len("${str}") = ${lenString}. Three separate appends: result.append(str(${lenString})), result.append("#"), result.append("${str}").`,
      // nth:1 selects encode's append (decode has its own identical "result.append(string)" line later).
      anchor: { match: 'result.append(str(lenString))', to: { match: 'result.append(string)', nth: 1 } },
      state: {
        type: 'array',
        cells: encoded.split('').map((c, idx) => ({
          value: c,
          state: idx >= before ? ('found' as const) : ('visited' as const),
        })),
        pointers: [],
        arrayLabel: 'result parts (joined so far)',
      },
      variables: [
        { name: 'string', value: `"${str}"`, highlight: true },
        { name: 'lenString', value: lenString, highlight: true },
        { name: 'result (joined)', value: `"${encoded}"` },
      ],
    });
  }

  steps.push({
    explanation: `Encoding done: "".join(result) = "${encoded}". This single string is sent over the wire; the receiver decodes it back into ["Hello", "World"] using two pointers — i marks the start of a frame, j scans to its "#".`,
    anchor: { match: 'return "".join(result)' },
    state: {
      type: 'array',
      cells: encoded.split('').map((c) => ({ value: c, state: 'default' as const })),
      pointers: [],
      arrayLabel: 'transmissionString (to decode)',
    },
    variables: [{ name: 'encoded', value: `"${encoded}"`, highlight: true }],
  });

  // ── Decode: outer while per word, inner while for the '#' scan ──────────────
  const chars = encoded.split('');
  const result: string[] = [];

  const decodeCells = (i: number, j: number, wordStart: number, wordEnd: number): ArrayCell[] =>
    chars.map((c, idx) => {
      let state: ArrayCell['state'] = 'default';
      if (idx < i) state = 'visited';
      else if (idx >= i && idx < j) state = 'window';        // length-prefix digits
      else if (idx === j && j < chars.length) state = 'active'; // the '#' delimiter
      else if (idx >= wordStart && idx < wordEnd) state = 'found'; // extracted word
      return { value: c, state };
    });

  let i = 0;
  steps.push({
    explanation: 'decode: result = [], i = 0. i will mark the start of each frame.',
    anchor: { match: 'i = 0' },
    state: {
      type: 'array',
      cells: decodeCells(0, 0, -1, -1),
      pointers: [{ index: 0, label: 'i' }],
      arrayLabel: 'transmissionString (decoding)',
    },
    variables: [{ name: 'i', value: i }, { name: 'result', value: '[]' }],
  });

  while (i < chars.length) {
    let j = i + 1;
    while (chars[j] !== '#') j++;
    const lenString = parseInt(encoded.slice(i, j), 10);
    const wordStart = j + 1;
    const wordEnd = j + 1 + lenString;
    const string = encoded.slice(wordStart, wordEnd);

    steps.push({
      explanation: `i=${i}: j = i + 1 = ${i + 1}, then advance j while s[j] != "#". It stops at index ${j} (the "#"). The digits between i and j spell "${encoded.slice(i, j)}", so lenString = int(s[${i}:${j}]) = ${lenString}.`,
      anchor: { match: 'j = i + 1', to: { match: 'j+=1' } },
      state: {
        type: 'array',
        cells: decodeCells(i, j, -1, -1),
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j (#)' },
        ],
        arrayLabel: 'transmissionString (decoding)',
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: 'j', value: j, highlight: true },
        { name: 'lenString', value: lenString, highlight: true },
      ],
    });

    result.push(string);
    steps.push({
      explanation: `string = s[${wordStart}:${wordEnd}] = "${string}" (the ${lenString} characters after "#"). result.append(string). Then i = j+1+lenString = ${wordEnd} to start the next frame.`,
      anchor: { match: 'lenString = int(s[i:j])', to: { match: 'i = j+1+lenString' } },
      state: {
        type: 'array',
        cells: decodeCells(i, j, wordStart, wordEnd),
        pointers: [
          { index: wordStart, label: 'word start' },
          { index: wordEnd - 1, label: 'word end' },
        ],
        arrayLabel: 'transmissionString (decoding)',
      },
      variables: [
        { name: 'string', value: `"${string}"`, highlight: true },
        { name: 'result', value: `[${result.map((w) => `"${w}"`).join(', ')}]` },
        { name: 'next i', value: wordEnd },
      ],
    });

    i = wordEnd;
  }

  steps.push({
    explanation: `i reached the end of the string — the while loop ends. Return [${result.map((w) => `"${w}"`).join(', ')}], exactly the original list. Both encode and decode are O(total length): each character is touched a constant number of times (the two-pointer scan avoids the O(n²) of repeated split()).`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: chars.map((c) => ({ value: c, state: 'visited' as const })),
      pointers: [],
      arrayLabel: 'transmissionString (decoded)',
      counters: [{ label: 'decoded', value: `[${result.map((w) => `"${w}"`).join(', ')}]` }],
    },
    variables: [
      { name: 'result', value: `[${result.map((w) => `"${w}"`).join(', ')}]`, highlight: true },
    ],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Length Prefix (two-pointer decode)',
  variant: 'length-prefix',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

export const encodeAndDecodeStringsMeta: AlgorithmMeta = {
  id: 'encode-and-decode-strings',
  lcNumber: 271,
  title: 'Encode and Decode Strings',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'String', 'Design'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Design an algorithm to encode a list of strings into a single string, transmit it, and decode it back into the original list. The encoding must survive any characters — including delimiters and digits — appearing inside the strings.',
  examples: [
    { input: 'strs = ["Hello","World"]', output: '["Hello","World"]' },
    { input: 'strs = [""]', output: '[""]', explanation: 'Encodes to "0#" and decodes back to a single empty string.' },
  ] as ProblemExample[],
  constraints: [
    '0 ≤ strs.length < 100',
    '0 ≤ strs[i].length < 200',
    'strs[i] may contain any of the 256 ASCII characters.',
  ],
  hint: 'A plain delimiter fails because the delimiter could appear inside a string. Prefix each string with its length followed by a separator ("5#Hello"). On decode, read the length, then slice exactly that many characters — the body is never scanned for delimiters.',
  solutions: [solution],
};
