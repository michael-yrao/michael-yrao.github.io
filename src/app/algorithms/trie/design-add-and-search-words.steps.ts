// Solution + comments sourced from cse-progress: dsa/leetcode/trie/211_design_add_and_search_words_data_structure.py
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class TrieNode:
    def __init__(self):
        self.children = {}
        self.isWord = False

class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def addWord(self, word: str) -> None:
        traversal = self.root
        for char in word:
            if char not in traversal.children:
                traversal.children[char] = TrieNode()
            traversal = traversal.children[char]
        traversal.isWord = True

    def search(self, word: str) -> bool:
        # walk known chars; on '.' recurse into every child
        def dfs(i, node):
            currentNode = node
            for j in range(i, len(word)):
                char = word[j]
                if char == '.':
                    for child in currentNode.children.values():
                        if dfs(j + 1, child):
                            return True
                    return False
                else:
                    if char not in currentNode.children:
                        return False
                    currentNode = currentNode.children[char]
            return currentNode.isWord
        return dfs(0, self.root)`;

// Fixed trie for the words bad / dad / mad (unique node ids, shared char labels).
type TNode = { id: string; char: string; x: number; y: number; children: Record<string, string>; isWord: boolean };
const TRIE: Record<string, TNode> = {
  r: { id: 'r', char: '•', x: 180, y: 30, children: { b: 'nb', d: 'nd', m: 'nm' }, isWord: false },
  nb: { id: 'nb', char: 'b', x: 70, y: 95, children: { a: 'nba' }, isWord: false },
  nba: { id: 'nba', char: 'a', x: 70, y: 160, children: { d: 'nbad' }, isWord: false },
  nbad: { id: 'nbad', char: 'd', x: 70, y: 225, children: {}, isWord: true },
  nd: { id: 'nd', char: 'd', x: 180, y: 95, children: { a: 'nda' }, isWord: false },
  nda: { id: 'nda', char: 'a', x: 180, y: 160, children: { d: 'ndad' }, isWord: false },
  ndad: { id: 'ndad', char: 'd', x: 180, y: 225, children: {}, isWord: true },
  nm: { id: 'nm', char: 'm', x: 290, y: 95, children: { a: 'nma' }, isWord: false },
  nma: { id: 'nma', char: 'a', x: 290, y: 160, children: { d: 'nmad' }, isWord: false },
  nmad: { id: 'nmad', char: 'd', x: 290, y: 225, children: {}, isWord: true },
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const revealed = new Set<string>(['r']);

  const nodes = (active: string | null, path: Set<string>): GraphNode[] =>
    [...revealed].map((id) => {
      const t = TRIE[id];
      return {
        id,
        x: t.x,
        y: t.y,
        state: (id === active ? 'active' : path.has(id) ? 'found' : 'visited') as GraphNode['state'],
        label: t.isWord ? `${t.char}✓` : t.char,
      };
    });

  const edges = (path: Set<string>): GraphEdge[] => {
    const out: GraphEdge[] = [];
    for (const id of revealed) {
      for (const childId of Object.values(TRIE[id].children)) {
        if (revealed.has(childId)) {
          out.push({ from: id, to: childId, state: path.has(id) && path.has(childId) ? 'found' : 'default' });
        }
      }
    }
    return out;
  };

  const mkState = (active: string | null, path: Set<string>, counters: { label: string; value: number | string }[]): Step['state'] => ({
    type: 'graph',
    directed: true,
    nodes: nodes(active, path),
    edges: edges(path),
    counters,
  });

  steps.push({
    explanation:
      'WordDictionary backed by a trie. addWord inserts a path of characters and flags the last node isWord (shown ✓). search matches known characters directly, but on a "." wildcard it must recurse into every child. Root is •.',
    highlightLine: 5,
    state: mkState(null, new Set(), [{ label: 'words', value: 0 }]),
    variables: [],
  });

  // ── addWord for bad, dad, mad ───────────────────────────────────────────────
  const addWord = (word: string, pathIds: string[]) => {
    let count = 0;
    let cur = 'r';
    const walked = new Set<string>(['r']);
    for (let c = 0; c < word.length; c++) {
      const childId = pathIds[c];
      const isNew = !revealed.has(childId);
      revealed.add(childId);
      cur = childId;
      walked.add(childId);
      count++;
      steps.push({
        explanation: `addWord("${word}"): char '${word[c]}' → ${isNew ? 'not present, create a new TrieNode' : 'already present, descend'}. Move to it.${c === word.length - 1 ? ` Mark it isWord = True (end of "${word}").` : ''}`,
        highlightLine: isNew ? 16 : 17,
        state: mkState(cur, walked, [{ label: 'addWord', value: `"${word}"` }, { label: 'depth', value: count }]),
        variables: [{ name: 'char', value: word[c], highlight: true }, { name: 'isWord', value: c === word.length - 1 ? 'True' : 'False' }],
      });
    }
  };

  addWord('bad', ['nb', 'nba', 'nbad']);
  addWord('dad', ['nd', 'nda', 'ndad']);
  addWord('mad', ['nm', 'nma', 'nmad']);

  // ── search that mirrors dfs(i, node) ────────────────────────────────────────
  const search = (word: string): boolean => {
    steps.push({
      explanation: `search("${word}"): start dfs at root, index 0.`,
      highlightLine: 21,
      state: mkState('r', new Set(['r']), [{ label: 'search', value: `"${word}"` }]),
      variables: [],
    });

    const dfs = (i: number, nodeId: string, path: Set<string>): boolean => {
      let cur = nodeId;
      const localPath = new Set(path);
      localPath.add(cur);
      for (let j = i; j < word.length; j++) {
        const ch = word[j];
        if (ch === '.') {
          const children = Object.values(TRIE[cur].children);
          steps.push({
            explanation: `Position ${j}: '.' wildcard at node '${TRIE[cur].char}' → try every child (${children.map((c) => `'${TRIE[c].char}'`).join(', ') || 'none'}).`,
            highlightLine: 27,
            state: mkState(cur, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: j }, { label: 'char', value: '. (wildcard)' }]),
            variables: [{ name: 'wildcard', value: 'yes', highlight: true }],
          });
          for (const childId of children) {
            if (dfs(j + 1, childId, localPath)) return true;
          }
          steps.push({
            explanation: `Position ${j}: no child of '${TRIE[cur].char}' led to a match → return False for this branch.`,
            highlightLine: 30,
            state: mkState(cur, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: j }, { label: 'result', value: 'False' }]),
            variables: [{ name: 'return', value: 'False' }],
          });
          return false;
        } else {
          if (!(ch in TRIE[cur].children)) {
            steps.push({
              explanation: `Position ${j}: '${ch}' is not a child of node '${TRIE[cur].char}' → dead end, return False.`,
              highlightLine: 33,
              state: mkState(cur, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: j }, { label: 'char', value: ch }, { label: 'result', value: 'False' }]),
              variables: [{ name: 'char', value: ch }, { name: 'return', value: 'False', highlight: true }],
            });
            return false;
          }
          cur = TRIE[cur].children[ch];
          localPath.add(cur);
          steps.push({
            explanation: `Position ${j}: '${ch}' matches → descend to it.`,
            highlightLine: 35,
            state: mkState(cur, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: j }, { label: 'char', value: ch }]),
            variables: [{ name: 'char', value: ch, highlight: true }],
          });
        }
      }
      const res = TRIE[cur].isWord;
      steps.push({
        explanation: `Reached end of "${word}" at node '${TRIE[cur].char}'. isWord = ${res ? 'True' : 'False'} → return ${res ? 'True' : 'False'}.`,
        highlightLine: 36,
        state: mkState(cur, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'isWord', value: res ? 'True' : 'False' }]),
        variables: [{ name: 'isWord', value: res ? 'True' : 'False', highlight: true }],
      });
      return res;
    };

    return dfs(0, 'r', new Set());
  };

  search('pad'); // exact miss on first char
  search('.ad'); // wildcard resolves via 'b'
  search('b..'); // exact then two wildcards

  steps.push({
    explanation:
      'Done. addWord is O(word length). search is O(word length) for exact queries; each "." can branch to all 26 children, so worst case is O(26^(#dots) · length) — the wildcard is what makes this more than a plain trie lookup.',
    highlightLine: 37,
    state: mkState(null, new Set(), [{ label: 'complete', value: 'yes' }]),
    variables: [],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Trie + Wildcard DFS',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(len) add; O(26^dots · len) search',
  spaceComplexity: 'O(total chars)',
};

export const designAddAndSearchWordsMeta: AlgorithmMeta = {
  id: 'design-add-and-search-words',
  lcNumber: 211,
  title: 'Design Add and Search Words Data Structure',
  difficulty: 'Medium',
  category: 'trie',
  tags: ['Trie', 'DFS', 'Design', 'Backtracking'],
  timeComplexity: 'O(len) add',
  spaceComplexity: 'O(total chars)',
  description:
    'Design WordDictionary supporting addWord(word) and search(word), where search may contain "." matching any single letter.',
  examples: [
    {
      input: 'addWord("bad"), addWord("dad"), addWord("mad"), search("pad"), search("bad"), search(".ad"), search("b..")',
      output: 'false, true, true, true',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ word.length ≤ 25', 'search words may contain up to 2 dots (LeetCode)', 'At most 10⁴ calls.'],
  hint: 'Store words in a trie. Exact characters walk a single path. A "." forks the search: recurse into every child at that node and succeed if any branch matches — a DFS with backtracking over the trie.',
  solutions: [solution],
};
