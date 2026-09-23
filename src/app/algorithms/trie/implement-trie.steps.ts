import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, GraphState, GraphNode, GraphEdge, StepVariable, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's Trie + helper TrieNode verbatim (dsa/leetcode/trie/208_implement_trie_prefix_tree.py).
// Anchors below reuse the same section for insert's create-vs-reuse branches (nth 1),
// search's branch (nth 2) and startsWith's branch (nth 3) — the check-and-descend
// lines are byte-identical across all three methods.
const INSERT_CHECK_TO_DESCEND: StepAnchor = {
  match: 'if char not in inc.children:',
  nth: 1, // 1st hit: insert() (search has the 2nd, startsWith the 3rd)
  to: { match: 'inc = inc.children[char]', nth: 1 },
};
const SEARCH_CHECK_TO_DESCEND: StepAnchor = {
  match: 'if char not in inc.children:',
  nth: 2, // 2nd hit: search() (insert has the 1st, startsWith the 3rd)
  to: { match: 'inc = inc.children[char]', nth: 2 },
};
const STARTSWITH_CHECK_TO_DESCEND: StepAnchor = {
  match: 'if char not in inc.children:',
  nth: 3, // 3rd hit: startsWith() (insert has the 1st, search the 2nd)
  to: { match: 'inc = inc.children[char]', nth: 3 },
};

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
    anchor: StepAnchor,
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
      anchor,
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
      { match: 'class TrieNode:', to: { match: 'self.isEnd = False' } },
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
    mk('insert("apple"): start the cursor inc at the root, then walk one character at a time.', { match: 'def insert(self, word: str) -> None:' }, 'root', ['root'], undefined, [
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
          `char '${ch}': '${ch}' is not in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → create a new TrieNode for it, then descend: inc = inc.children['${ch}'].`,
          INSERT_CHECK_TO_DESCEND,
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
        { match: 'inc.isEnd = True' },
        'apple',
        walked,
        undefined,
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── insert("app") — reuses existing nodes, marks an INTERNAL end ─────────────
  opLabel = 'insert("app")';
  steps.push(mk('insert("app"): reset inc to root. Notice "app" shares the prefix we already built.', { match: 'def insert(self, word: str) -> None:' }, 'root', ['root'], undefined, [
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
          `char '${ch}': '${ch}' is already in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → the check is false, so skip the create, just descend. No new node is added.`,
          INSERT_CHECK_TO_DESCEND,
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
        { match: 'inc.isEnd = True' },
        'app',
        walked,
        undefined,
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── insert("bad") — a second branch off the root ────────────────────────────
  opLabel = 'insert("bad")';
  steps.push(mk('insert("bad"): reset inc to root. \'b\' is a brand-new branch off the root.', { match: 'def insert(self, word: str) -> None:' }, 'root', ['root'], undefined, [
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
          `char '${ch}': not in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → create a new TrieNode and descend.`,
          INSERT_CHECK_TO_DESCEND,
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
      mk('Mark inc.isEnd = True on \'d\'. "bad" is stored in its own branch, sharing nothing with the "app…" branch.', { match: 'inc.isEnd = True' }, 'bad', walked, undefined, [
        { name: 'inc.isEnd', value: 'True', highlight: true },
      ])
    );
  }

  // ── search("app") → True ────────────────────────────────────────────────────
  opLabel = 'search("app")';
  steps.push(mk('search("app"): reset inc to root and walk each character, checking it exists.', { match: 'def search(self, word: str) -> bool:' }, 'root', ['root'], undefined, [
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
          `char '${ch}': '${ch}' is in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → the not-in check is false → step down.`,
          SEARCH_CHECK_TO_DESCEND,
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
        { match: 'return inc.isEnd' },
        'app',
        walked,
        'True',
        [{ name: 'inc.isEnd', value: 'True', highlight: true }]
      )
    );
  }

  // ── search("ap") → False (node exists but isEnd is False) ───────────────────
  opLabel = 'search("ap")';
  steps.push(mk('search("ap"): reset inc to root.', { match: 'def search(self, word: str) -> bool:' }, 'root', ['root'], undefined, [{ name: 'word', value: '"ap"' }]));
  {
    const ids = PATH['app'].slice(0, 2); // a, ap
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const id of ids) {
      const ch = POS[id].char;
      walked.push(id);
      steps.push(
        mk(`char '${ch}': found in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down.`, SEARCH_CHECK_TO_DESCEND, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        'End of "ap" at the first \'p\'. return inc.isEnd → False: this node exists, but "ap" was only ever a prefix — never inserted as a whole word. search is strict about isEnd; startsWith is not.',
        { match: 'return inc.isEnd' },
        'ap',
        walked,
        'False',
        [{ name: 'inc.isEnd', value: 'False', highlight: true }]
      )
    );
  }

  // ── search("bat") → False (missing child) ───────────────────────────────────
  opLabel = 'search("bat")';
  steps.push(mk('search("bat"): reset inc to root.', { match: 'def search(self, word: str) -> bool:' }, 'root', ['root'], undefined, [{ name: 'word', value: '"bat"' }]));
  {
    const walk: [string, string][] = [['b', 'b'], ['a', 'ba']]; // char, id
    const walked: string[] = ['root'];
    let prevId = 'root';
    for (const [ch, id] of walk) {
      walked.push(id);
      steps.push(
        mk(`char '${ch}': found in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down.`, SEARCH_CHECK_TO_DESCEND, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        "char 't': node 'a' (in the \"ba…\" branch) has only one child, 'd'. 't' is not in inc.children → return False immediately. No point scanning further.",
        { match: 'return False', nth: 1 }, // 1st hit: search() (startsWith has the 2nd)
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
  steps.push(mk('startsWith("app"): reset inc to root. Same walk as search, but the ending rule differs.', { match: 'def startsWith(self, prefix: str) -> bool:' }, 'root', ['root'], undefined, [
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
        mk(`char '${ch}': in ${POS[prevId].char === '•' ? 'root' : `'${POS[prevId].char}'`}.children → step down.`, STARTSWITH_CHECK_TO_DESCEND, id, walked, undefined, [
          { name: 'char', value: `'${ch}'`, highlight: true },
          { name: 'inc', value: `'${ch}'` },
        ])
      );
      prevId = id;
    }
    steps.push(
      mk(
        'Every character of "app" matched an existing node. startsWith does NOT check isEnd — simply reaching the end of the prefix means some word has it as a prefix. return True.',
        { match: 'return True' },
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
      { match: 'class Trie:' },
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
  variant: 'children-map',
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
