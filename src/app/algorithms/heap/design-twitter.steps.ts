import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's Twitter verbatim: the tweet clock is `globalTweetCount`, the follow
// map is `followMap`, and getNewsFeed builds `relevantUsers` in one expression
// (`set(self.followMap[userId]) | {userId}`). The merge heap (`heap`) pushes
// `(-timestamp, tweetId)` so the smallest tuple — i.e. the largest timestamp — pops first,
// and getNewsFeed returns `result` as built, with no reversal: newest-first, matching the
// New Feed spec.

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
    anchor: Step['anchor'],
    feed: number[],
    heap: [number, number][],
    returns?: string
  ): Step => ({
    explanation: '',
    anchor,
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

  const push = (step: Step, explanation: string, variables: Step['variables']): void => {
    steps.push({ ...step, explanation, variables });
  };

  // 1. Twitter()
  push(
    mk('Twitter()', { match: 'def __init__(self):' }, [], []),
    'Construct Twitter: globalTweetCount = 0 (a monotonic clock so newer tweets get a higher timestamp), followMap (user → who they follow) and tweetMap (user → their tweets as (timestamp, tweetId)) both empty.',
    [{ name: 'globalTweetCount', value: 0 }]
  );

  // 2. postTweet(1, 5)
  (tweetMap[1] ||= []).push([globalTweetCount, 5]);
  globalTweetCount++;
  push(
    mk('postTweet(1, 5)', { match: 'self.tweetMap[userId].append((self.globalTweetCount, tweetId))', to: { match: 'self.globalTweetCount+=1' } }, [], []),
    'postTweet(1, 5): append (globalTweetCount=0, tweetId=5) to user 1’s tweets, then bump globalTweetCount → 1. globalTweetCount records ordering so the feed can sort by recency.',
    [{ name: 'tweetMap[1]', value: '[(0,5)]', highlight: true }, { name: 'globalTweetCount', value: 1 }]
  );

  // 3. getNewsFeed(1)
  newsFeed(1, 'getNewsFeed(1)');

  // 4. follow(1, 2)
  (followMap[1] ||= []).push(2);
  push(
    mk('follow(1, 2)', { match: 'self.followMap[followerId].append(followeeId)' }, [], []),
    'follow(1, 2): append 2 to user 1’s followMap. User 1 will now see user 2’s tweets in their feed.',
    [{ name: 'followMap[1]', value: '[2]', highlight: true }]
  );

  // 5. postTweet(2, 6)
  (tweetMap[2] ||= []).push([globalTweetCount, 6]);
  globalTweetCount++;
  push(
    mk('postTweet(2, 6)', { match: 'self.tweetMap[userId].append((self.globalTweetCount, tweetId))', to: { match: 'self.globalTweetCount+=1' } }, [], []),
    'postTweet(2, 6): append (globalTweetCount=1, tweetId=6) to user 2’s tweets; globalTweetCount → 2. Note 6 has a higher globalTweetCount than 5, so it’s newer.',
    [{ name: 'tweetMap[2]', value: '[(1,6)]', highlight: true }, { name: 'globalTweetCount', value: 2 }]
  );

  // 6. getNewsFeed(1)
  newsFeed(1, 'getNewsFeed(1)');

  // 7. unfollow(1, 2)
  followMap[1] = (followMap[1] || []).filter((x) => x !== 2);
  push(
    mk('unfollow(1, 2)', { match: 'if followeeId in self.followMap[followerId]:', to: { match: 'self.followMap[followerId].remove(followeeId)' } }, [], []),
    'unfollow(1, 2): 2 is in user 1’s followMap → remove it. User 2’s tweets will no longer appear in user 1’s feed.',
    [{ name: 'followMap[1]', value: '[]', highlight: true }]
  );

  // 8. getNewsFeed(1)
  newsFeed(1, 'getNewsFeed(1)');

  return steps;

  // Sub-routine: getNewsFeed builds relevantUsers in one expression, merges each relevant
  // user's tweets into a min-heap of (-timestamp, tweetId) so the newest tweet pops first,
  // then pops up to 10 into result and returns it as-is — already newest-first, no reversal.
  function newsFeed(userId: number, op: string): void {
    const relevant = [...new Set<number>([userId, ...(followMap[userId] || [])])];
    push(
      mk(op, { match: 'relevantUsers = set(self.followMap[userId]) | {userId}' }, [], []),
      `${op}: relevantUsers = set(self.followMap[${userId}]) | {${userId}} = {${relevant.map((u) => `u${u}`).join(', ')}}. We merge their tweets to find the 10 most recent.`,
      [{ name: 'relevantUsers', value: `{${relevant.map((u) => `u${u}`).join(', ')}}`, highlight: true }]
    );

    // Build heap: push (-timestamp, tweetId); the smallest tuple (largest timestamp) pops first.
    const heap: [number, number][] = [];
    for (const followee of relevant) {
      for (const [t, tweet] of tweetMap[followee] || []) {
        heap.push([t, tweet]);
        heap.sort((a, b) => b[0] - a[0]);
        push(
          mk(op, { match: 'heapq.heappush(heap, (-timestamp, tweetId))' }, [], heap),
          `Push user ${followee}'s tweet ${tweet} (time ${t}) onto heap as (−timestamp, tweetId), so the newest (max timestamp) pops first.`,
          [{ name: 'pushed', value: `${tweet}@t${t}`, highlight: true }, { name: 'heap size', value: heap.length }]
        );
      }
    }

    // Pop up to 10 most-recent into result — newest-first throughout.
    const result: number[] = [];
    while (heap.length && result.length < 10) {
      const [t, tweet] = heap.shift()!;
      result.push(tweet);
      push(
        mk(op, { match: 'while heap and len(result) < 10:', to: { match: 'result.append(currentFeed[1])' } }, result, heap),
        `Pop the newest tweet: currentFeed = (−${t}, ${tweet}); append currentFeed[1] → result = [${result.join(', ')}].`,
        [{ name: 'popped', value: `${tweet}@t${t}`, highlight: true }, { name: 'result', value: `[${result.join(', ')}]` }]
      );
    }

    push(
      mk(op, { match: 'return result' }, result, [], `[${result.join(', ')}]`),
      `Heap drained (or 10 reached): return result = [${result.join(', ')}] — already newest-first, no reversal.`,
      [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }]
    );
  }
}

const solution: SolutionVariant = {
  label: 'Hash Maps + Heap-Merged Feed',
  variant: 'heap-feed',
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
