import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-progress: dsa/leetcode/heap/355_design_twitter.py
const PYTHON_CODE = `import collections
import heapq

class Twitter:

    def __init__(self):
        # globalTweetCount to keep track of heap
        self.globalTweetCount = 0
        # person -> followee
        self.followMap = collections.defaultdict(list)
        # person -> (globalTweetCount, tweet)
        self.tweetMap = collections.defaultdict(list)

    def postTweet(self, userId: int, tweetId: int) -> None:
        # add to tweet map
        self.tweetMap[userId].append((self.globalTweetCount, tweetId))
        self.globalTweetCount+=1

    def getNewsFeed(self, userId: int) -> List[int]:
        result = []
        heap = []

        # build a heap with all the values in tweetMap that this user follows
        # or the user himself

        relevantUsers = set(self.followMap[userId]) | {userId}

        for user in relevantUsers:
            for timestamp, tweetId in self.tweetMap[user]:
                # timestamp goes up, so we need to negate it to get latest
                heapq.heappush(heap, (-timestamp, tweetId))

        # now we get 10 or until heap
        while heap and len(result) < 10:
            currentFeed = heapq.heappop(heap)
            result.append(currentFeed[1])
        return result

    def follow(self, followerId: int, followeeId: int) -> None:
        self.followMap[followerId].append(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        if followeeId in self.followMap[followerId]:
            self.followMap[followerId].remove(followeeId)`;

function generateSteps(): Step[] {
  const steps: Step[] = [];
  let globalTweetCount = 0;
  const followMap: Record<number, number[]> = {};
  const tweetMap: Record<number, [number, number][]> = {};

  const tweetMapDisplay = (): Record<string | number, string> =>
    Object.fromEntries(
      Object.entries(tweetMap).map(([u, ts]) => [`u${u}`, ts.length ? ts.map(([t, id]) => `${id}@t${t}`).join(', ') : '∅'])
    );
  const followMapDisplay = (): Record<string | number, string> =>
    Object.fromEntries(
      Object.entries(followMap).map(([u, f]) => [`u${u}`, f.length ? f.map((x) => `u${x}`).join(', ') : '∅'])
    );

  const mk = (
    op: string,
    line: number,
    feed: number[],
    heap: [number, number][],
    returns?: string
  ): Step => ({
    explanation: '',
    highlightLine: line,
    state: {
      type: 'array',
      cells: feed.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      hashmap: tweetMapDisplay(),
      hashmapLabel: 'tweetMap (user → tweetId@time)',
      hashmap2: followMapDisplay(),
      hashmap2Label: 'followMap (user → follows)',
      stackItems: heap.map(([t, id]) => `${id}@t${t}`),
      counters: [
        { label: 'op', value: op },
        { label: 'globalTweetCount', value: globalTweetCount },
        ...(returns !== undefined ? [{ label: 'returns', value: returns }] : []),
      ],
    },
    variables: [],
  });

  const push = (s: Step, explanation: string, variables: Step['variables']) => {
    s.explanation = explanation;
    s.variables = variables;
    steps.push(s);
  };

  // 1. Twitter()
  push(
    mk('Twitter()', 8, [], []),
    'Construct Twitter: globalTweetCount = 0 (a monotonic clock so newer tweets get a higher timestamp), followMap (user → who they follow) and tweetMap (user → their tweets as (timestamp, tweetId)) both empty.',
    [{ name: 'globalTweetCount', value: 0 }]
  );

  // 2. postTweet(1, 5)
  (tweetMap[1] ||= []).push([globalTweetCount, 5]);
  globalTweetCount++;
  push(
    mk('postTweet(1, 5)', 16, [], []),
    'postTweet(1, 5): append (timestamp=0, tweetId=5) to user 1’s tweets, then bump globalTweetCount → 1. The timestamp records ordering so the feed can sort by recency.',
    [{ name: 'tweetMap[1]', value: '[(0,5)]', highlight: true }, { name: 'globalTweetCount', value: 1 }]
  );

  // 3. getNewsFeed(1)
  newsFeed(1, 'getNewsFeed(1)');

  // 4. follow(1, 2)
  (followMap[1] ||= []).push(2);
  push(
    mk('follow(1, 2)', 40, [], []),
    'follow(1, 2): append 2 to user 1’s followMap. User 1 will now see user 2’s tweets in their feed.',
    [{ name: 'followMap[1]', value: '[2]', highlight: true }]
  );

  // 5. postTweet(2, 6)
  (tweetMap[2] ||= []).push([globalTweetCount, 6]);
  globalTweetCount++;
  push(
    mk('postTweet(2, 6)', 16, [], []),
    'postTweet(2, 6): append (timestamp=1, tweetId=6) to user 2’s tweets; globalTweetCount → 2. Note 6 has a higher timestamp than 5, so it’s newer.',
    [{ name: 'tweetMap[2]', value: '[(1,6)]', highlight: true }, { name: 'globalTweetCount', value: 2 }]
  );

  // 6. getNewsFeed(1)  → [6, 5]
  newsFeed(1, 'getNewsFeed(1)');

  // 7. unfollow(1, 2)
  followMap[1] = (followMap[1] || []).filter((x) => x !== 2);
  push(
    mk('unfollow(1, 2)', 44, [], []),
    'unfollow(1, 2): remove 2 from user 1’s followMap. User 2’s tweets will no longer appear in user 1’s feed.',
    [{ name: 'followMap[1]', value: '[]', highlight: true }]
  );

  // 8. getNewsFeed(1)  → [5]
  newsFeed(1, 'getNewsFeed(1)');

  return steps;

  // Sub-routine: getNewsFeed with per-step heap build + pop.
  function newsFeed(userId: number, op: string): void {
    const relevant = [...new Set<number>([userId, ...(followMap[userId] || [])])];
    push(
      mk(op, 26, [], []),
      `${op}: relevantUsers = the people user ${userId} follows ∪ {${userId}} = {${relevant.map((u) => `u${u}`).join(', ')}}. We merge their tweets to find the 10 most recent.`,
      [{ name: 'relevantUsers', value: `{${relevant.map((u) => `u${u}`).join(', ')}}`, highlight: true }]
    );

    // Build heap: push (timestamp, tweetId); newest (max timestamp) kept on top.
    const heap: [number, number][] = [];
    for (const u of relevant) {
      for (const [t, id] of tweetMap[u] || []) {
        heap.push([t, id]);
        heap.sort((a, b) => b[0] - a[0]);
        push(
          mk(op, 31, [], heap),
          `Push user ${u}'s tweet ${id} (timestamp ${t}) onto the heap. (Python pushes (−timestamp, id) into a min-heap so the newest pops first.)`,
          [{ name: 'pushed', value: `${id}@t${t}`, highlight: true }, { name: 'heap size', value: heap.length }]
        );
      }
    }

    // Pop up to 10 most-recent into the result.
    const result: number[] = [];
    while (heap.length && result.length < 10) {
      const [t, id] = heap.shift()!;
      result.push(id);
      push(
        mk(op, 35, result, heap),
        `Pop the newest tweet: ${id} (timestamp ${t}). Append to feed → [${result.join(', ')}].`,
        [{ name: 'popped', value: `${id}@t${t}`, highlight: true }, { name: 'feed', value: `[${result.join(', ')}]` }]
      );
    }

    push(
      mk(op, 37, result, [], `[${result.join(', ')}]`),
      `Heap drained (or 10 reached). ${op} returns [${result.join(', ')}] — most recent first.`,
      [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }]
    );
  }
}

const solution: SolutionVariant = {
  label: 'Hash Maps + Heap-Merged Feed',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'getNewsFeed O(t log t)',
  spaceComplexity: 'O(users + tweets)',
};

export const designTwitterMeta: AlgorithmMeta = {
  id: 'design-twitter',
  lcNumber: 355,
  title: 'Design Twitter',
  difficulty: 'Medium',
  category: 'heap',
  tags: ['Heap', 'Priority Queue', 'Hash Map', 'Design'],
  timeComplexity: 'getNewsFeed O(t log t)',
  spaceComplexity: 'O(users + tweets)',
  description:
    'Design a simplified Twitter: users can postTweet, follow/unfollow other users, and getNewsFeed — the 10 most recent tweet IDs from the user and everyone they follow, newest first.',
  examples: [
    {
      input: 'postTweet(1,5); getNewsFeed(1); follow(1,2); postTweet(2,6); getNewsFeed(1); unfollow(1,2); getNewsFeed(1)',
      output: '[5], [6,5], [5]',
      explanation: 'A global timestamp orders tweets; a heap merges the relevant users’ tweets to pull the 10 newest.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ userId, followerId, followeeId ≤ 500',
    '0 ≤ tweetId ≤ 10⁴',
    'All tweets have unique IDs',
    'At most 3 × 10⁴ calls across all methods',
    'A user cannot follow themselves',
  ],
  hint: 'Store each tweet with a global, increasing timestamp (user → list of (time, tweetId)). For the feed, collect tweets from the user + everyone they follow and use a heap to pull the 10 with the largest timestamps.',
  solutions: [solution],
};
