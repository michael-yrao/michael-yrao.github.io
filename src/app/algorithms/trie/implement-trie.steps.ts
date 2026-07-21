import { AlgorithmMeta, SolutionVariant, Step, GraphState, GraphNode, GraphEdge, StepVariable, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-progress: dsa/leetcode/trie/208_implement_trie_prefix_tree.py
const PYTHON_CODE = `class TrieNode:
    def __init__(self):
        # char -> TrieNode map
        self.children = {}
        # does a word end here
        self.isEnd = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        inc = self.root
        for char in word:
            # if we haven't seen this char yet
            # append to inc.children as a new child
            if char not in inc.children:
                inc.children[char] = TrieNode()
            # when we are here, the char is guaranteed in the Trie so we go down the trie
            inc = inc.children[char]
        # when we finish, mark inc.isEnd as True
        inc.isEnd = True

    def search(self, word: str) -> bool:
        inc = self.root
        for char in word:
            if char not in inc.children:
                return False
            # if it is, we step down the inc
            inc = inc.children[char]
        return inc.isEnd

    def startsWith(self, prefix: str) -> bool:
        inc = self.root
        for char in prefix:
            if char not in inc.children:
                return False
            # if it is, we step down the inc
            inc = inc.children[char]
        return True`;

// ── Static layout for the trie built during this walkthrough ─────────────────
// We insert "apple", "app", "bad" — this branches at the root (a / b) and marks
// an internal word-end at "app" (which still has a child 'l'). Node ids are the
// full path (unique); the displayed label is the single character.
const POS: Record<string, { x: number; y: number; char: string }> = {
  root:  { x: 60,  y: 170, char: '•' },
  a:     { x: 170, y: 90,  char: 'a' },
  ap:    { x: 280, y: 90,  char: 'p' },
  app:   { x: 390, y: 90,  char: 'p' },
  appl:  { x: 500, y: 90,  char: 'l' },
  apple: { x: 610, y: 90,  char: 'e' },
  b:     { x: 170, y: 250, char: 'b' },
  ba:    { x: 280, y: 250, char: 'a' },
  bad:   { x: 390, y: 250, char: 'd' },
};

const EDGES: [string, string][] = [
  ['root', 'a'], ['a', 'ap'], ['ap', 'app'], ['app', 'appl'], ['appl', 'apple'],
  ['root', 'b'], ['b', 'ba'], ['ba', 'bad'],
];

// Char path for each id (used to walk step by step)
const PATH: Record<string, string[]> = {
  apple: ['a', 'ap', 'app', 'appl', 'apple'],
  app: ['a', 'ap', 'app'],
  bad: ['b', 'ba', 'bad'],
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const revealed = new Set<string>(['root']);
  const ends = new Set<string>();
  let opLabel = '—';

  const label = (id: string) => POS[id].char + (ends.has(id) ? '✓' : '');

  const mk = (
    explanation: string,
    line: number,
    activeId: string,
    path: string[],
    result?: string,
    variables?: StepVariable[]
  ): Step => {
    const pathSet = new Set(path);
    const nodes: GraphNode[] = [...revealed].map((id) => ({
      id,
      x: POS[id].x,
      y: POS[id].y,
      label: label(id),
      state:
        id === activeId ? 'active'
        : pathSet.has(id) ? 'visited'
        : ends.has(id) ? 'found'
        : 'default',
    }));
    const edges: GraphEdge[] = EDGES
      .filter(([f, t]) => revealed.has(f) && revealed.has(t))
      .map(([f, t]) => ({
        from: f,
        to: t,
        state: t === activeId ? 'active' : pathSet.has(t) ? 'visited' : 'default',
      }));
    return {
      explanation,
      highlightLine: line,
      state: {
        type: 'graph',
        nodes,
        edges,
        counters: [
          { label: 'operation', value: opLabel },
          ...(result !== undefined ? [{ label: 'returns', value: result }] : []),
        ],
      } as GraphState,
      variables,
    };
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push(
    mk(
      'A trie (prefix tree) stores words character by character. Every node is a TrieNode with a children map (char → node) and an isEnd flag marking where a word finishes. We start with just an empty root. Word-end nodes are drawn with a ✓.',
      11,
      'root',
      [],
      undefined,
      [
        { name: 'self.root', value: 'TrieNode()' },
        { name: 'children', value: '{}' },
      ]
    )
  );

  // ── insert("apple") ─────────────────────────────────────────────────────────
  opLabel = 'insert("apple")';
  steps.push(
    mk('insert("apple"): start the cursor inc at the root, then walk one character at a time.', 14, 'root', ['root'], undefined, [
      { name: 'word', value: '"apple"' },
      { name: 'inc', value: 'root' },
    ])
  );
  {
    const ids = PATH['apple'];
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ch = POS[id].char;
      revealed.add(id); // char not in children → create a new TrieNode child
      walked.push(id);
      steps.push(
        mk(
          `char '${ch}': '${ch}' is not in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → create a new TrieNode for it (line 18), then descend: inc = inc.children['${ch}'] (line 20).`,
          18,
          id,
          walked,
          undefined,
          [
            { name: 'char', value: `'${ch}'`, highlight: true },
            { name: 'in children?', value: 'no → create' },
            { name: 'inc', value: `'${ch}'`, highlight: true },
          ]
        )
      );
      prevId = id;
    }
    ends.add('apple');
    steps.push(
      mk(
        'End of word: mark inc.isEnd = True. The node holding \'e\' now terminates the word "apple" (shown with ✓).',
        22,
        'apple',
        walked,
        undefined,
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── insert("app") — reuses existing nodes, marks an INTERNAL end ─────────────
  opLabel = 'insert("app")';
  steps.push(mk('insert("app"): reset inc to root. Notice "app" shares the prefix we already built.', 14, 'root', ['root'], undefined, [
    { name: 'word', value: '"app"' },
    { name: 'inc', value: 'root' },
  ]));
  {
    const ids = PATH['app'];
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ch = POS[id].char;
      walked.push(id); // already revealed — char in children, no new node
      steps.push(
        mk(
          `char '${ch}': '${ch}' is already in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → skip the create (line 17 is false), just descend (line 20). No new node is added.`,
          20,
          id,
          walked,
          undefined,
          [
            { name: 'char', value: `'${ch}'`, highlight: true },
            { name: 'in children?', value: 'yes → reuse' },
            { name: 'inc', value: `'${ch}'`, highlight: true },
          ]
        )
      );
      prevId = id;
    }
    ends.add('app');
    steps.push(
      mk(
        'Mark inc.isEnd = True on the second \'p\'. This is an INTERNAL node — it still has a child \'l\' leading to "apple" — proving a word can end in the middle of a longer path.',
        22,
        'app',
        walked,
        undefined,
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── insert("bad") — a second branch off the root ────────────────────────────
  opLabel = 'insert("bad")';
  steps.push(mk('insert("bad"): reset inc to root. \'b\' is a brand-new branch off the root.', 14, 'root', ['root'], undefined, [
    { name: 'word', value: '"bad"' },
    { name: 'inc', value: 'root' },
  ]));
  {
    const ids = PATH['bad'];
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const ch = POS[id].char;
      revealed.add(id);
      walked.push(id);
      steps.push(
        mk(
          `char '${ch}': not in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → create a new TrieNode (line 18) and descend (line 20).`,
          18,
          id,
          walked,
          undefined,
          [
            { name: 'char', value: `'${ch}'`, highlight: true },
            { name: 'in children?', value: 'no → create' },
            { name: 'inc', value: `'${ch}'`, highlight: true },
          ]
        )
      );
      prevId = id;
    }
    ends.add('bad');
    steps.push(
      mk('Mark inc.isEnd = True on \'d\'. "bad" is stored in its own branch, sharing nothing with the "app…" branch.', 22, 'bad', walked, undefined, [
        { name: 'inc.isEnd', value: 'True', highlight: true },
      ])
    );
  }

  // ── search("app") → True ────────────────────────────────────────────────────
  opLabel = 'search("app")';
  steps.push(mk('search("app"): reset inc to root and walk each character, checking it exists.', 25, 'root', ['root'], undefined, [
    { name: 'word', value: '"app"' },
  ]));
  {
    const ids = PATH['app'];
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const id of ids) {
      const ch = POS[id].char;
      walked.push(id);
      steps.push(
        mk(
          `char '${ch}': '${ch}' is in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children (line 27 false) → step down (line 30).`,
          30,
          id,
          walked,
          undefined,
          [
            { name: 'char', value: `'${ch}'`, highlight: true },
            { name: 'inc', value: `'${ch}'` },
          ]
        )
      );
      prevId = id;
    }
    steps.push(
      mk(
        'Reached the end of "app" at the second \'p\'. return inc.isEnd → True: we marked this node as a word-end during insert("app").',
        31,
        'app',
        walked,
        'True',
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── search("ap") → False (node exists but isEnd is False) ───────────────────
  opLabel = 'search("ap")';
  steps.push(mk('search("ap"): reset inc to root.', 25, 'root', ['root'], undefined, [{ name: 'word', value: '"ap"' }]));
  {
    const ids = PATH['app'].slice(0, 2); // a, ap
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const id of ids) {
      const ch = POS[id].char;
      walked.push(id);
      steps.push(
        mk(`char '${ch}': found in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down (line 30).`, 30, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        'End of "ap" at the first \'p\'. return inc.isEnd → False: this node exists, but "ap" was only ever a prefix — never inserted as a whole word. search is strict about isEnd; startsWith is not.',
        31,
        'ap',
        walked,
        'False',
        [{ name: 'inc.isEnd', value: 'False', highlight: true }]
      )
    );
  }

  // ── search("bat") → False (missing child) ───────────────────────────────────
  opLabel = 'search("bat")';
  steps.push(mk('search("bat"): reset inc to root.', 25, 'root', ['root'], undefined, [{ name: 'word', value: '"bat"' }]));
  {
    const walk: [string, string][] = [['b', 'b'], ['a', 'ba']]; // char, id
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const [ch, id] of walk) {
      walked.push(id);
      steps.push(
        mk(`char '${ch}': found in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down (line 30).`, 30, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        "char 't': node 'a' (in the \"ba…\" branch) has only one child, 'd'. 't' is not in inc.children → return False immediately (line 28). No point scanning further.",
        28,
        'ba',
        walked,
        'False',
        [
          { name: 'char', value: "'t'", highlight: true },
          { name: "'t' in children?", value: 'no → return False', highlight: true },
        ]
      )
    );
  }

  // ── startsWith("app") → True ────────────────────────────────────────────────
  opLabel = 'startsWith("app")';
  steps.push(mk('startsWith("app"): reset inc to root. Same walk as search, but the ending rule differs.', 34, 'root', ['root'], undefined, [
    { name: 'prefix', value: '"app"' },
  ]));
  {
    const ids = PATH['app'];
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const id of ids) {
      const ch = POS[id].char;
      walked.push(id);
      steps.push(
        mk(`char '${ch}': in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down (line 39).`, 39, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        'Every character of "app" matched an existing node. startsWith does NOT check isEnd — simply reaching the end of the prefix means some word has it as a prefix. return True.',
        40,
        'app',
        walked,
        'True',
        [{ name: 'result', value: 'True', highlight: true }]
      )
    );
  }

  // ── Final ───────────────────────────────────────────────────────────────────
  opLabel = 'done';
  steps.push(
    mk(
      'The finished trie stores "apple", "app", and "bad" with shared prefixes collapsed into shared paths. Each insert / search / startsWith walks exactly one node per character: O(L) per operation where L is the word length, independent of how many words are stored. Space is O(total characters inserted).',
      42,
      '',
      [],
      undefined,
      [{ name: 'stored words', value: 'apple, app, bad' }]
    )
  );

  return steps;
}

const solution: SolutionVariant = {
  label: 'TrieNode (children map)',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(L) per op',
  spaceComplexity: 'O(total chars)',
};

export const implementTrieMeta: AlgorithmMeta = {
  id: 'implement-trie',
  lcNumber: 208,
  title: 'Implement Trie (Prefix Tree)',
  difficulty: 'Medium',
  category: 'trie',
  tags: ['Trie', 'Design', 'Hash Map', 'String'],
  timeComplexity: 'O(L) per op',
  spaceComplexity: 'O(total chars)',
  description:
    'Implement a trie (prefix tree) supporting insert(word), search(word) — true only if the exact word was inserted — and startsWith(prefix) — true if any inserted word has the given prefix. Each node holds a children map (char → node) and an isEnd flag.',
  examples: [
    {
      input:
        '["Trie","insert","search","search","startsWith","insert","search"]\n[[],["apple"],["apple"],["app"],["app"],["app"],["app"]]',
      output: '[null, null, true, false, true, null, true]',
      explanation:
        'insert("apple"); search("apple")→true; search("app")→false (not yet a full word); startsWith("app")→true; insert("app"); search("app")→true.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ word.length, prefix.length ≤ 2000',
    'word and prefix consist only of lowercase English letters.',
    'At most 3×10⁴ calls in total to insert, search, and startsWith.',
  ],
  hint: 'Give each node a dictionary of child nodes keyed by character and a boolean isEnd. insert walks/creates nodes char by char and flags the last; search does the same walk and returns the last node\'s isEnd; startsWith returns true as long as the walk never hits a missing child.',
  solutions: [solution],
};
