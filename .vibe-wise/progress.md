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

## Events page: why it was empty, and unlinking it (2026-10-09)
Question: why Snowflake World Tour events were not on the Events page.
Found (live probes): the World Tour is published only on snowflake.com, which exposes no ICS/JSON/API and which no source in `worker/src/sources.ts` polls; the Bevy user-group source works (24 results, two NYC chapter meetups reach the page); the Meetup Snowflake source is a deleted group (404, shown as "Some sources didn't load"); `events-view.ts` line 7 claims `other`-area events surface via source/search but `filterEvents` applies the area filter unconditionally (comment drift, unfixed).
Source evaluation: zero-code feeds exist (NYC Systems Luma calendar `cal-Dq7vVCs9HWPhLk4`, 1 upcoming; Meetup groups NYC Python / NY Kubernetes / Data Council NYC, 0 upcoming; Papers We Love returns "Invalid feed signature"); CNCF and GDG Bevy sites have no NYC chapter and would need the `/new-york/` constant in `bevy.ts` made per-source; confs.tech GitHub JSON (31 category files, fields name/url/startDate/endDate/city/country/online) is the only conference feed and would need a new adapter kind; Gary's Guide and AI Tinkerers NYC are HTML only; vendor roadshows (Snowflake, AWS Summit, DASH, Cloud Next, Databricks) have no feed; Eventbrite needs a token; MongoDB user groups and Microsoft Reactor NYC are dead ends.
Learner decision: "remove events page for now", refined to "hide the page and not allow the page to be fetched" → unlink only (route, drawer link, title description, sitemap path), feature code and worker kept.
Status: implemented 2026-10-09 (8 files, 7+/24-); two specs updated (drawer lists five links; `/events` redirects to `/`); sitemap regenerated (9 static paths); lint 0 errors, build green, full suite 1528 passed; uncommitted. Open for whenever the page returns: the dead Meetup Snowflake row, the `other`-area comment drift, and which of the evaluated sources earn a row.
