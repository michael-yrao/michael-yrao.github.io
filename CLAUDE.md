# michael-yrao.github.io — Progressive Overflow (algorithm visualizer site)

Angular app that renders step-by-step LeetCode algorithm visualizers. Each problem lives in
`src/app/algorithms/<category>/<name>.steps.ts` and exports an `AlgorithmMeta` with one or more
`SolutionVariant`s. Every variant has `pythonCode`, a `generateSteps()` function, and complexity labels.

## Source of truth: cse-review

The canonical Python solutions and their comments live in the sibling **cse-review** repo:

```
/Users/yaorao/Documents/dev/cse-review/dsa/leetcode/<category>/<number>_<name>.py
```

When adding or reconstructing a visualizer:

- **Take the `pythonCode` and its comments verbatim from cse-review.** Do not invent, paraphrase,
  or strip the comments — the comments capture the intended reasoning and must be preserved.
- **If cse-review has multiple solution methods for a problem, the visualizer must offer the
  corresponding multiple `SolutionVariant`s** (e.g. 261 Graph Valid Tree has both a DFS and a
  Union Find method, so its meta should expose both). Dated re-practice methods
  (e.g. `validTree_20260619_UnionFind`) are the same approach practiced again — collapse those to one
  variant per distinct approach, using the cleanest/most-commented instance.
- If a solution is missing from cse-review, ask before writing one from scratch.

## Visualizer quality bar

A visualizer must read like a true step-by-step for someone new to the problem:
push a step for **every loop iteration and every recursion call** (including inner/nested loops,
base cases, and returns) — never collapse a loop into a single summary step. Log every relevant
variable in each step's `variables` / `state.counters`. No `generateSteps` may return `[]`.

## Deploy

`main` is source. The live site (custom domain **progressiveoverflow.com**) is served from the
**`gh-pages`** branch, published with `angular-cli-ghpages`. Deploys publish the **working tree**
(uncommitted WIP included), so build from the working tree and preserve the CNAME:

```
npx ng build --configuration production
npx angular-cli-ghpages --dir=dist/progressive-overflow --cname=progressiveoverflow.com
```
