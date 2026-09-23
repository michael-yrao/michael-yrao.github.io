// Traces cse-progress's WordDictionary_20260812 + helper TrieNode_20260812 verbatim
// (dsa/leetcode/trie/211_design_add_and_search_words_data_structure.py): the search
// helper is named trieSearch(trieNode, startingIndex), its loop variable is `i`, and
// it checks the char match with `elif currentChar in trieNode.children:` — a not-in
// check happens only in the `else: return False` branch, not as a guard before the
// descend (the earlier site version inverted this to `if char not in ...: return False`).
import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const ADD_WORD_CREATE_OR_REUSE: StepAnchor = {
  match: 'if char not in traversal.children:',
  to: { match: 'traversal = traversal.children[char]' },
};
const ADD_WORD_LAST_CHAR: StepAnchor = {
  match: 'if char not in traversal.children:',
  to: { match: 'traversal.isWord = True' },
};
const WILDCARD_ENTER: StepAnchor = {
  match: "if currentChar == '.':",
  to: { match: 'for childNode in trieNode.children.values():' },
};
// 'return False' has 4 hits in this entry: line 165 (comment), line 166 (wildcard
// fallback — code), line 169 (comment), line 171 (else branch — code). Anchor off a
// unique start instead of a bare nth so only the two CODE hits are ever in play.
const WILDCARD_EXHAUSTED: StepAnchor = {
  match: 'for childNode in trieNode.children.values():',
  to: { match: 'return False', nth: 2 }, // 2nd hit: line 166 (the wildcard fallback); skips line 165's comment
};
const CHAR_NOT_FOUND: StepAnchor = {
  match: 'else:',
  to: { match: 'return False', nth: 4 }, // 4th hit: line 171 (the else branch); skips lines 165/166/169
};
const CHAR_MATCHES_DESCEND: StepAnchor = {
  match: 'elif currentChar in trieNode.children:',
  to: { match: 'trieNode = trieNode.children[currentChar]' },
};

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
      'WordDictionary_20260812 backed by TrieNode_20260812 (children map + isWord flag). addWord walks/creates a path of characters and flags the last node isWord = True (shown ✓). search calls trieSearch(trieNode, startingIndex), which matches known characters directly, but on a "." wildcard recurses into every child. Root is •.',
    anchor: { match: 'class TrieNode_20260812:', to: { match: 'self.isWord = False' } },
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
      const isLastChar = c === word.length - 1;
      revealed.add(childId);
      cur = childId;
      walked.add(childId);
      count++;
      steps.push({
        explanation: `addWord("${word}"): char '${word[c]}' → ${isNew ? 'not present, create a new TrieNode_20260812' : 'already present, descend'}. traversal = traversal.children['${word[c]}'].${isLastChar ? ` End of word: traversal.isWord = True (end of "${word}").` : ''}`,
        anchor: isLastChar ? ADD_WORD_LAST_CHAR : ADD_WORD_CREATE_OR_REUSE,
        state: mkState(cur, walked, [{ label: 'addWord', value: `"${word}"` }, { label: 'depth', value: count }]),
        variables: [{ name: 'char', value: word[c], highlight: true }, { name: 'isWord', value: isLastChar ? 'True' : 'False' }],
      });
    }
  };

  addWord('bad', ['nb', 'nba', 'nbad']);
  addWord('dad', ['nd', 'nda', 'ndad']);
  addWord('mad', ['nm', 'nma', 'nmad']);

  // ── search, mirroring trieSearch(trieNode, startingIndex) ────────────────────
  const search = (word: string): boolean => {
    steps.push({
      explanation: `search("${word}"): traversal = self.root, then return trieSearch(traversal, 0) — start at the root, index 0.`,
      anchor: { match: 'return trieSearch(traversal, 0)' },
      state: mkState('r', new Set(['r']), [{ label: 'search', value: `"${word}"` }]),
      variables: [],
    });

    const trieSearch = (startingIndex: number, nodeId: string, path: Set<string>): boolean => {
      let trieNode = nodeId;
      const localPath = new Set(path);
      localPath.add(trieNode);
      for (let i = startingIndex; i < word.length; i++) {
        const currentChar = word[i];
        if (currentChar === '.') {
          const children = Object.values(TRIE[trieNode].children);
          steps.push({
            explanation: `i=${i}: currentChar == '.' → wildcard at node '${TRIE[trieNode].char}'. Try every childNode (${children.map((c) => `'${TRIE[c].char}'`).join(', ') || 'none'}) via trieSearch(childNode, i+1).`,
            anchor: WILDCARD_ENTER,
            state: mkState(trieNode, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: i }, { label: 'char', value: '. (wildcard)' }]),
            variables: [{ name: 'currentChar', value: '.', highlight: true }],
          });
          for (const childId of children) {
            if (trieSearch(i + 1, childId, localPath)) return true;
          }
          steps.push({
            explanation: `i=${i}: no childNode of '${TRIE[trieNode].char}' returned True from trieSearch → return False for this branch.`,
            anchor: WILDCARD_EXHAUSTED,
            state: mkState(trieNode, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: i }, { label: 'result', value: 'False' }]),
            variables: [{ name: 'return', value: 'False' }],
          });
          return false;
        } else if (currentChar in TRIE[trieNode].children) {
          trieNode = TRIE[trieNode].children[currentChar];
          localPath.add(trieNode);
          steps.push({
            explanation: `i=${i}: elif currentChar in trieNode.children — '${currentChar}' matches → trieNode = trieNode.children['${currentChar}'].`,
            anchor: CHAR_MATCHES_DESCEND,
            state: mkState(trieNode, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: i }, { label: 'char', value: currentChar }]),
            variables: [{ name: 'currentChar', value: currentChar, highlight: true }],
          });
        } else {
          steps.push({
            explanation: `i=${i}: '${currentChar}' is not a wildcard and not in node '${TRIE[trieNode].char}'.children → else: return False.`,
            anchor: CHAR_NOT_FOUND,
            state: mkState(trieNode, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'index', value: i }, { label: 'char', value: currentChar }, { label: 'result', value: 'False' }]),
            variables: [{ name: 'currentChar', value: currentChar }, { name: 'return', value: 'False', highlight: true }],
          });
          return false;
        }
      }
      const res = TRIE[trieNode].isWord;
      steps.push({
        explanation: `Loop exhausted at "${word}" on node '${TRIE[trieNode].char}'. return trieNode.isWord → ${res ? 'True' : 'False'}.`,
        anchor: { match: 'return trieNode.isWord' },
        state: mkState(trieNode, localPath, [{ label: 'search', value: `"${word}"` }, { label: 'isWord', value: res ? 'True' : 'False' }]),
        variables: [{ name: 'isWord', value: res ? 'True' : 'False', highlight: true }],
      });
      return res;
    };

    return trieSearch(0, 'r', new Set());
  };

  search('pad'); // exact miss on first char
  search('.ad'); // wildcard resolves via 'b'
  search('b..'); // exact then two wildcards

  steps.push({
    explanation:
      'Done. addWord is O(word length). search is O(word length) for exact queries; each "." can branch to all 26 children, so worst case is O(26^(#dots) · length) — the wildcard is what makes this more than a plain trie lookup.',
    anchor: { match: 'class WordDictionary_20260812:' },
    state: mkState(null, new Set(), [{ label: 'complete', value: 'yes' }]),
    variables: [],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Trie + Wildcard DFS',
  variant: 'wildcard-dfs',
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
