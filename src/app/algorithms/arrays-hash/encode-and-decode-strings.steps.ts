import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/arrays_and_hash/271_encode_and_decode_string.py
// (the two-pointer decode variant, Solution_20260703)
const PYTHON_CODE = `class Solution:
    # this problem is the basis of Length Prefix Framing for transmitting over networks
    # we provide a length and a delimiter in front of the string so we don't read the string itself
    # and just provide based on the length in front

    def encode(self, strs: List[str]) -> str:
        transmissionString = ""
        for string in strs:
            lenPrefix = len(string)
            lenPrefixFrame = str(lenPrefix) + "#" + string
            transmissionString+=lenPrefixFrame
        return transmissionString

    def decode(self, s: str) -> List[str]:
        # to decode, we want to read the len in front and then take that length into result
        # first thought is to do a split on # and get the first part of the split
        # but doing this for the entire string would give us O(n^2)
        # so we will do it manually using pointers
        # need two pointers, one to track start, one to track end of word
        result = []

        i = 0

        while i < len(s):
            j = i
            while s[j] != '#':
                j+=1
            # now we know i -> j is the length
            lenStr = int(s[i:j])
            # now the word is from j+1 -> j+1+lenStr
            word = s[j+1:j+1+lenStr]
            result.append(word)
            i=j+1+lenStr
        return result`;

const STRS = ['Hello', 'World'];

function generateSteps(): Step[] {
  const steps: Step[] = [];

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'The hard part is separating strings when any character (including "#" or digits) may appear inside them. Solution: length-prefix framing. Prefix each string with its length and a "#". On decode we read the number, then take exactly that many characters — a "#" inside the body can never confuse us.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      arrayLabel: 'encoded string',
    },
    variables: [
      { name: 'strs', value: '["Hello", "World"]' },
      { name: 'transmissionString', value: '""' },
    ],
  });

  // ── Encode: one step per string in strs ────────────────────────────────────
  let encoded = '';
  for (const string of STRS) {
    const frame = `${string.length}#${string}`;
    const before = encoded.length;
    encoded += frame;
    steps.push({
      explanation: `Encode "${string}": lenPrefix = len("${string}") = ${string.length}, so lenPrefixFrame = "${string.length}#${string}". Append it. The "${string.length}#" prefix tells the decoder exactly how many characters of body follow.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: encoded.split('').map((c, idx) => ({
          value: c,
          state: idx >= before ? ('found' as const) : ('visited' as const),
        })),
        pointers: [],
        arrayLabel: 'transmissionString (building)',
      },
      variables: [
        { name: 'string', value: `"${string}"`, highlight: true },
        { name: 'lenPrefixFrame', value: `"${frame}"`, highlight: true },
        { name: 'transmissionString', value: `"${encoded}"` },
      ],
    });
  }

  steps.push({
    explanation: `Encoding done: "${encoded}". This single string is sent over the wire; the receiver decodes it back into ["Hello", "World"] using two pointers — i marks the start of a frame, j scans to its "#".`,
    highlightLine: 13,
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
  while (i < chars.length) {
    let j = i;
    while (chars[j] !== '#') j++;
    const lenStr = parseInt(encoded.slice(i, j), 10);
    const wordStart = j + 1;
    const wordEnd = j + 1 + lenStr;
    const word = encoded.slice(wordStart, wordEnd);

    steps.push({
      explanation: `i=${i}: set j=i and advance j while s[j] != "#". It stops at index ${j} (the "#"). The digits between i and j spell "${encoded.slice(i, j)}", so lenStr = int(s[${i}:${j}]) = ${lenStr}.`,
      highlightLine: 28,
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
        { name: 'lenStr', value: lenStr, highlight: true },
      ],
    });

    result.push(word);
    steps.push({
      explanation: `The word is the ${lenStr} characters after "#": word = s[${wordStart}:${wordEnd}] = "${word}". Append it to result, then jump i to j+1+lenStr = ${wordEnd} to start the next frame.`,
      highlightLine: 34,
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
        { name: 'word', value: `"${word}"`, highlight: true },
        { name: 'result', value: `[${result.map((w) => `"${w}"`).join(', ')}]` },
        { name: 'next i', value: wordEnd },
      ],
    });

    i = wordEnd;
  }

  steps.push({
    explanation: `i reached the end of the string — the while loop ends. Return [${result.map((w) => `"${w}"`).join(', ')}], exactly the original list. Both encode and decode are O(total length): each character is touched a constant number of times (the two-pointer scan avoids the O(n²) of repeated split()).`,
    highlightLine: 36,
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
  pythonCode: PYTHON_CODE,
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
