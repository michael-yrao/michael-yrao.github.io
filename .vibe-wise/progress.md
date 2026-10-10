# Learning Progress

## Codebase walkthrough (started 2026-10-08)
Goal: the learner explains, in their own words, how each layer of progressiveoverflow is written; Claude checks against verified code and explains what is unfamiliar.
Stations, in dependency order (status per station):
1. Boot and routing + the end-to-end request trace — taught 2026-10-08, awaiting reasoning on the showcase/?repo= question
2. Data funnel and fallback policies (GitHubFileService, author-fallback, per-service policy) — not started
3. Visualizer pipeline (.steps.ts -> builders -> generated registry -> anchors -> groundedness) — not started
4. Practice runtime (Pyodide worker, TS judge, drafts, WalkthroughStateService) — not started
5. Progress page (lazy tiers, untracked effect, helper classes, view-state service, board rules) — not started
6. Interview subsystem (codes -> PBKDF2 -> lookup/token/key, KV rev/stale, P2P collab, guard) — not started
7. Worker events pipeline and caching — not started
8. Secondary features and shared layer — not started
9. CI, contract mirror, generated-file checks, lint ladder — not started
Drift list (doc or comment disagrees with code; candidates for later fixes, none approved): CLAUDE.md "Wiring a new visualizer" names a hand-edited `algorithms.data.ts` (registry is generated); CLAUDE.md says `INTERVIEW_CODES_ENABLED` is off in production (it is `true`); CLAUDE.md Problems-tab badge "🟢/🎓/🏆 vs in progress" (code always `○`); `worker/README.md` KV placeholder step; stale light-theme comments in `code-editor` and brand README; `groundedness-meter` doc names an Algorithms list that no longer uses it; `FloodFillComponent` has no `ngOnDestroy`.

Introduced: the end-to-end trace of /practice/:n/solution (lazy route -> injectPracticeProblem -> generated index + lazy steps chunk -> GitHubFileService funnel -> WalkthroughStateService -> anchor resolution); why the showcase ignores ?repo=.
Demonstrated understanding: nothing yet.
Needs reinforcement: nothing yet.

## Practice figure: lines from the stored answer (2026-10-08)
Requirement: 9003 Lost Map's input is a distance matrix, so the matrix figure (every nonzero pair = an edge) drew every pair as a road.
Learner reasoning: identified that the figure maps one node to another via a weight while the problem's matrix holds total route distances, so the method is wrong for this problem; asked when a figure should build on the solution vs the input; chose Option A (a spec field naming the line source) over a matrix-kind field or a fourth edge source because it says at a glance what is drawn.
Explained: a figure draws the input when one input entry is one mark; it draws the answer when the lines only exist after solving; the figure code already receives each case's expected answer.
Confirmed design (Implement this step, 2026-10-08): `edges: expected` on a matrix figure draws only the answer's pairs. Proposed additions accepted with it: default color, labels from the matrix entry, rejected together with `highlight`, matrix figures only, no figure on a bad answer, cse-coach's copy untouched.
Status: implemented and reviewed 2026-10-09 (example-figure.ts matrix path split into squareMatrix / inputMatrixEdges / expectedMatrixEdges; validation in practice-validation.ts, export_practice.py and practice.schema.json); uncommitted.

## Site rows: both links (2026-10-09)
Requirement: every problem row shows a run link to /practice/<n> and an external ↗ to the judge page, like NeetCode's roadmap rows; schedule rows in cse-progress got the same (links.py --schedule).
Learner reasoning: two independent slots with a blank else so marks stay in column (the practice list already used that shape); for the practice list chose option A (li takes the grid, anchor over number/title/difficulty, marks as siblings, ↗ its own anchor) over a floated ↗ or a title-only link; label + tooltip combined to "External". Corrected a model: proposed an else-if chain over LC > NC > HelloInterview in the site; learned the priority is applied upstream in cse-progress new_problem.py and the site receives one url.
Confirmed design (Implement this step, 2026-10-09): externalJudgeUrlFor in core/data/lc-url.ts returns null for the site's own host, else leetCodeUrlFor; four progress templates get two slots; practice list restructured per option A. Proposed additions accepted: blank external slot for 9003-style rows, grid-column anchor over display: contents, fixed slot widths, one table-driven helper spec.
Status: implemented 2026-10-09; uncommitted.
