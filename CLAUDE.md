# michael-yrao.github.io — Progressive Overflow (algorithm visualizer site)

Angular app that renders step-by-step LeetCode algorithm visualizers. Each problem lives in
`src/app/algorithms/<category>/<name>.steps.ts` and exports an `AlgorithmMeta` with one or more
`SolutionVariant`s. Every variant has a `variant` id, a `generateSteps()` function, and complexity
labels — a variant's code is never stored here; it is fetched at runtime from cse-progress (see
below).

The brand kit lives in `src/assets/brand/` and the nav mark is `LogoMarkComponent`, drawn from theme
tokens.

## Source of truth: cse-progress

The canonical Python solutions and their comments live in the sibling **cse-progress** repo (formerly
named `cse-review` — old docs and paths may still say that). It sits **beside this repo**, not inside
it: locate the actual sibling checkout on the current machine rather than assuming a path — it is
machine-specific (e.g. `C:\Users\<user>\Documents\Software_Development\cse-progress\...` on Windows,
`/Users/<user>/.../cse-progress/...` on mac). The solutions live under:

```
<cse-progress>/dsa/leetcode/<category>/<number>_<name>.py
```

A variant's code is never pasted or stored in this repo. It is fetched at runtime from
cse-progress's `dashboard/showcase.json` (the gold-standard repo is hardcoded as
`GOLD_STANDARD_REPO`; `ShowcaseService` fetches it), and joined to a `SolutionVariant` by
`${lcNumber}:${variant}`. A step references source lines by content anchors —
`anchor: { match, nth?, to? }` — resolved against the fetched contract at load time, so the
visualizer always traces the live source rather than a copy that can drift out of sync. The
**pick** of which attempt/segment a showcase `key` maps to lives in cse-progress's
`dashboard/showcase.yml`, not here. (Earlier revisions of this repo stored a verbatim
`pythonCode` string per variant instead; that was retired at the Phase 2 cutover in favor of
the anchor mechanism above.)

When adding or reconstructing a visualizer:

- **Write anchors, not pasted code.** Do not invent, paraphrase, or hand-copy source into a
  `.steps.ts` file — the trace must be *derived* from the real cse-progress lines via
  `match`/`nth`/`to` anchors, and the `explanation` text must preserve the reasoning those
  comments capture. Verify every anchor resolves with (PowerShell):
  `$env:SHOWCASE_JSON = '<path to a fetched dashboard/showcase.json>'; npm run check:groundedness`.
  CI fetches the live contract and runs the same check on every push; a daily workflow
  re-checks it independently, since cse-progress can change out from under this repo.
- **If cse-progress has multiple solution methods for a problem, the visualizer must offer the
  corresponding multiple `SolutionVariant`s** (e.g. 261 Graph Valid Tree has both a DFS and a
  Union Find method, so its meta should expose both). Dated re-practice methods
  (e.g. `validTree_20260619_UnionFind`) are the same approach practiced again — collapse those to one
  variant per distinct approach, using the cleanest/most-commented instance.
- If a solution is missing from cse-progress, ask before writing one from scratch.

## Visualizer quality bar

A visualizer must read like a true step-by-step for someone new to the problem:
push a step for **every loop iteration and every recursion call** (including inner/nested loops,
base cases, and returns) — never collapse a loop into a single summary step. Log every relevant
variable in each step's `variables` / `state.counters`. No `generateSteps` may return `[]`.

## Wiring a new visualizer

A `.steps.ts` file is not picked up automatically. To register it, edit
`src/app/core/data/algorithms.data.ts`:

1. `import { <name>Meta } from '../../algorithms/<category>/<name>.steps';`
2. Add `<name>Meta` to the matching category's array.

## Self-reflection: lessons for future agents (what to do / not do)

Recorded from real mistakes. Read before answering "what's been visualized / what's left / how many problems."

**DON'T**

- **Don't trust memory or docs for counts and structure — they go stale.** In one session, project memory claimed "8 step generators" when there were **85**, and pointed at the old `data_structure_algorithms/2026_leetcode/` path *after* cse-progress had restructured to `dsa/leetcode/`. Verify against the live filesystem every time.
- **Don't run coverage analysis from a git worktree of cse-progress.** A worktree branched before a restructure still shows the **old** directory layout and yields confidently wrong answers. Always resolve against the **primary cse-progress checkout on `main`**.
- **Don't hardcode the sibling path.** The cse-progress path is machine-specific. Locate the actual sibling dir on the current machine; don't assume a path written in these docs.
- **Don't eyeball or subtract counts to produce a list.** "85 − 68 = 17 extra" is not an answer. Do a rigorous set diff by LeetCode **number**.
- **Don't match problems by slug/name.** Match by **LeetCode number** — names drift and legacy files are mislabeled (Design Twitter is **355**, but an old file was named `_335_`).

**DO**

- **Treat `cse-progress/docs/foundations/dsa/mastery/dsa_progress.md` as the authoritative "what's completed" record** — problem count, solution count (method variants included), and per-problem comfort (🏆/🟢/🟡/🔴). Its header stat line is the ground truth.
- **Compute viz coverage as a set diff:** extract `lcNumber` from every `src/app/algorithms/**/*.steps.ts`, extract leading numbers from `cse-progress/dsa/leetcode/**/*.py`, and `comm` the two sorted-unique lists. Report the direction asked (gaps vs. extras) explicitly.
- **Triangulate before reporting "done."** The file count, the mastery tracker, and the viz `lcNumber` set should agree; if they don't, find out why before answering.

## Testing gotchas

`fakeAsync`/`tick()` are **unavailable** under this project's Angular `unit-test` (vitest) builder —
it throws `Expected to be running in 'ProxyZone', but it was not found` (the experimental builder
doesn't wire up zone.js's Jasmine/Mocha-only ProxyZone patching `fakeAsync` needs). For a test that
needs to control WHEN an HTTP response resolves (e.g. to catch a signal-effect loop that only
manifests while a request is still pending), use a never-emitting Observable (`new Observable(() =>
{})`) instead of `delay()` + `tick()` — see `progress-page.component.spec.ts`'s effect-loop
regression test for the pattern. A synchronous `of()` mock is fine for ordinary "does it render"
assertions; it's specifically wrong for timing-sensitive ones, since it resolves before an effect
ever gets a chance to re-run.

## Deploy

`main` is source and is deployed automatically by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push: GitHub Actions
builds the app, then publishes it to GitHub Pages (Settings → Pages → Source: **GitHub Actions**).
There is no working-tree/manual step — a push to `main` is the deploy. The custom domain
(**progressiveoverflow.com**) is preserved because `src/CNAME` is copied into the build output via
`angular.json` `assets`.

## Progress feature

The Progress page renders the honest-progress contract emitted by `cse-progress/scripts/gamify.py`:
`dashboard/progress-summary.json` + `dashboard/progress.json` (older checkouts fall back to the
repo-root `progress-summary.json`/`progress.json`). `ProgressService` (`core/services/progress.service.ts`)
fetches each file from the GitHub Contents API (`Accept: application/vnd.github.raw`, cache
max-age 60 so the Refresh button actually returns current data) and falls back to
raw.githubusercontent.com only when the API 403s (its anonymous rate limit). `DEFAULT_REPO` in
that same file is the site author's own `cse-progress` checkout, shown when the viewer supplies no
`?repo=` query param. A viewer points the page at their own log with `?repo=owner/name`, optionally
`@branch` (`ProgressService.parseRepo` validates the slug and rejects anything else). The
header slug link has a *change* control that reveals the `?repo=` picker.

Tab order is fixed: **Overview · Mastery · Recognition · Problems · Activity**. On the Overview
tab's schedule board (the today-board component), consecutive items with `kind: 'complexity'` are
a single re-ask block and must render as **one** "Complexity gate" row, not one row per item —
collapsing them is a rendering rule, not a contract change. (The Problems tab lists tracker
problems, which never carry `kind`.) The muted `</>` glyph next to a problem's title is the
learner's own solution walkthrough; it is never labelled "Visualize" (that language overstates
what a personal practice write-up is). The leading status badge slot is `</>` when an on-site
walkthrough exists; otherwise, when the contract carries `file`, the same badge's `✓`/`○` links
to the learner's own solution file on GitHub instead (board: done/not done; Problems tab: clean
🟢/🎓/🏆 vs in progress), built by `fileUrl` from the contract's additive `file` path in the
repo/branch the page is rendering (`?repo=` aware, never the gold standard). With neither a
walkthrough nor a `file`, the board shows a plain `✓`/`○` and the Problems tab an empty spacer.

## Lint & test

`npm run lint` (ESLint via `@angular-eslint`) and `npx ng test --watch=false` (vitest) both must
pass; CI (`.github/workflows/deploy.yml`) runs both before `npm run build` on
every push.

**Run the toolchain on Node 24, the version CI uses** (`actions/setup-node` in deploy.yml). On a
Mac with Homebrew that is the keg-only `node@24`: prefix commands with
`export PATH=/opt/homebrew/opt/node@24/bin:$PATH`. Node 25+ ships an experimental `localStorage`
global (undefined without `--localstorage-file`) that shadows jsdom's in the vitest environment and
fails the Big-O trainer's filter-persistence specs; they pass on 24. Angular 22 / TypeScript 6 as
of Sep 24, 2026 — `ng update` refuses a dirty working tree, so commit first.
