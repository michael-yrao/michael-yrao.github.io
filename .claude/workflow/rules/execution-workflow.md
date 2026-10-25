# Execution Workflow (Plan → Implement → Review) — tech lead / team leads / engineers

**Applies to all repos.** For any **non-trivial** implementation task, split the work across roles by
model. This is the normative rule; the *why*/evidence lives in
`cse-progress/.claude/memory/feedback_execution_workflow.md`.

**Leads never write implementation.** The tech lead (the session — Fable on Max, Opus otherwise) and
every Opus team lead plan/supervise/advise/review only; every edit goes to a Sonnet `engineer` agent (or an `engineer-haiku` agent under the tier tests).

| Tier | Who | Model | Does | Never |
|---|---|---|---|---|
| **Tech lead** | the orchestrating session (you) | Fable on Max; Opus otherwise | design, write the plan, get approval, brief leads/engineers, review the consolidated diff, integrate (commit/push per the commit rule), optimize (token spend, wall-clock, shipped code, the workflow itself); hands down everything that does not need it | write implementation |
| **Team lead** | `team-lead` agent | Opus | own one slice of the approved plan: brief its ≤ 5 engineers, supervise, review their diffs for correctness, scope and wasted work, optimize the slice's code through its engineers, report a consolidated diff + review notes up to the tech lead | write implementation, commit/push, re-plan the slice's scope |
| **Engineer** | `engineer` / `engineer-haiku` agent | Sonnet (Haiku under the tier tests) | execute a brief: edits, tests, build; report the diff | commit/push, widen scope |

The three tiers map onto three phases — Plan (tech lead), Implement (engineers), Review (tech lead + any
team leads) — so the phase names still apply when a task is small enough for a single engineer with no
lead in between.

Walk `~/.claude/skills/write-plan/SKILL.md` before plan approval.

## Spawn rule: team leads are opt-in

The default is no team lead: the tech lead briefs, supervises and reviews every engineer itself.
A lead is an extra layer (an Opus spawn, a second review, a hand-off) and the plan must justify it.
The plan's Staffing section names each lead with a `Lead because:` line giving one of these
reasons, or says `Lead because: none`:

- **width**: the plan runs more than 5 engineers at once. Leads take groups of ≤ 5, so the
  tech lead never supervises more than 5 agents directly.
- **depth**: one slice is expected to need more than two review/fix rounds, or a long test or
  build log digested each round, while the tech lead holds other slices. On Fable a slice
  expected to need two or more rounds qualifies.

A lead owns ≤ 5 engineers. Team leads are spawned by the tech lead; engineers are spawned by
their lead, or by the tech lead when there is none. A cloud recipe routine
(`FACTORY_ROLE=team-lead`) is a lead by construction and needs no `Lead because:` line.
`brief_gate.py` denies a `team-lead` spawn whose brief has no `Lead because: width` or
`Lead because: depth` line.

Support agents (a sweep, state collection, checker runs: see the next section) are spawned by the tech lead
and do not count toward n.

## Engineer tier (Sonnet or Haiku)

The brief's author (tech lead or team lead) picks the tier. The default is Sonnet (`engineer`). Use
`engineer-haiku` only if **all five** of these hold, and the brief states the tier with one line per test:

1. **The checks decide correctness, not just shape.** The brief names a check (a test or command) for every
   output that fails on a wrong value. If an output can be wrong and still pass, the task is not simple.
2. **Nothing is derived.** Each change is copied, looked up, templated or a mechanical rename from a named
   source. It needs no algorithm, design call, reference solution or complexity call.
3. **No authored prose.** It writes no user-facing text and no rule, skill or doc prose.
4. **The context is named.** The brief lists every file the engineer reads or edits, so it needs no
   exploration.
5. **The change is small.** One repo, at most 3 files.

When unsure, use Sonnet.

**Escalation:** if a Haiku engineer's checks fail, the same brief is re-run once on `engineer` (Sonnet), with
no Haiku retry. The escalation is noted in the report up.

The factory's recipe tier (`recipe.yml tier:`, `factory.haiku_max_files`) applies the same tests to recipes.

## The tech lead owns optimization, and keeps only what needs it

The tech lead is accountable for four costs, each checked at a named step. It decides; it hands the
checking and the legwork down.

| Cost | Step | Check |
|---|---|---|
| **Token spend** | planning, briefing | Each task sits at the cheapest tier that can do it. A brief carries what the tech lead already knows, so no agent rediscovers it. A report comes back as a conclusion (diff stat, failing output), not a file or log dump. |
| **Wall-clock** | spawning | Independent slices spawn in one message and run in the background. Independent tool calls go in one message. The session never polls or sleeps on an agent. |
| **Shipped code** | reviewing a diff | The team lead is responsible for this inside its slice: it decides the optimization and has its engineer make it, without asking up, as long as the slice's behaviour and scope stay the same. With no lead, the tech lead is. Targets: a complexity the input size does not allow, I/O or parsing repeated in a loop, anything slow in a hook (a hook runs on every prompt or tool call). The tech lead checks the consolidated diff. Only waste that is visible or measured; `coding-style.md`'s "no premature optimization" still holds. |
| **The workflow** | after integrating | A run that wasted spend or time (an empty hand-back, a re-sent brief, a re-spawn, a rule read two ways) gets its cause named by the tech lead and fixed by an engineer in the rule, agent definition or hook, in the same session. The evidence goes in the why file. A cause already in the self-eval log is fixed one rung higher than last time (recurrence floor, CLAUDE.md gate 5). |

**Stays with the tech lead:** the design and the plan, every exchange with the user, the review of the
consolidated diff, commit and push, the decision on each cost above (shipped code inside a lead's slice is
the lead's), and the carve-outs below.

**Goes down, with as many engineers as it takes (and a lead only for a named `Lead because:` reason):**

- A sweep across many files, or a long log or test output to digest: an `Explore` agent, or an engineer
  on a read-only brief, which returns the conclusion.
- The pasted state a brief needs (`git status`, quoted lines, dry-run output): an engineer.
- Supervision, test and build runs, the first review of each diff, and optimizing the slice's code: the tech lead, or a team lead when the plan's `Lead because:` line names one.
- Checker scripts and verification runs: an engineer.

How many agents that takes is the tech lead's call, made per task. The floor: an agent is spawned for this work when the work is larger than the brief
it needs, and a read of one known file stays inline.

**On Fable, the session's own context is the first cost.** Every token the session reads or writes costs
more than the same token anywhere else in the tree, so the list above is not optional on Fable.

- Nothing already in context is read or run again.
- A built-in agent (`Explore`, `Plan`, `general-purpose`) is spawned with an explicit `model`: `sonnet`
  for a sweep, `opus` for design. Without one it can inherit Fable (see the Model rule).
- Rule and brief text is checked against how Fable behaves in observed runs, not against how an earlier
  model behaved.

## Briefs carry pasted state, never described state

Every repo a plan or brief names gets its `git status --short` output **pasted into the brief** (a clean repo
is pasted as a fenced block whose first line is `git status --short` and second is `(clean)` — never as
prose; `brief_gate.py` denies the prose form), and every
count or "nothing depends on X" claim in a plan comes from a command that was run, pasted, not from a grep
remembered or a state inferred from an adjacent command. A brief is a mechanical artifact: a second agent with
the same inputs must produce the same brief, and "clean" / "no spec depends on it" are one-command facts.

**Enforced by `brief_gate.py`** (PreToolUse, matcher `Agent`): a `team-lead` or `engineer` spawn whose prompt carries no `git status --short` paste is DENIED; an allowed spawn gets a warn-only reminder of the rest of this section. On Windows (`win32`) only, a brief that names `michael-yrao.github.io` and runs the Angular CLI through `npm run lint|test`, `npx ng` or bare `ng …` is DENIED too; the bootstrap path (`node node_modules/@angular/cli/bin/bootstrap.js …`) is the one that runs on this machine. A `team-lead` brief that tells the lead to run its engineers in the background is DENIED, because `agents/team-lead.md` requires them in the foreground. A `team-lead` brief with no `Lead because: width|depth` line is DENIED (see "Spawn rule: team leads are opt-in").

The checklist for this section is `~/.claude/skills/write-brief/SKILL.md`, walked before every `team-lead` / `engineer` spawn.

**A claim that a file says X quotes the matched line.** "`study_guide.md` names 394" is backed by the LINE
pasted into the plan or brief, never by a match count, a line number alone, or a substring hit. The same
holds for a verification step's expected output: it is pasted from a dry run, or marked *expected,
unverified*.

**A brief names the tests to add.** It lists them per `~/.claude/rules/testing.md` — the behaviour that can
break, table-driven, nothing trivial or already proven — and the engineer adds those and no others.

**A plan that replaces a paragraph of user-facing text quotes the old paragraph in full beside the new
one.** A dropped sentence is then visible at approval. For any other paragraph, the tech lead diffs old
against new at its own review and confirms no sentence or citation was dropped.

## A running agent's status is read from file times, not from silence

A status answer about a background agent pastes the newest mtime in its slice (`ls -lt`, top line) next to
the current time. "No notification yet" is not "working", and a file listing is not a file time. A lead or
engineer quiet for more than twice its previous round is stopped and re-briefed from the tree. The new brief
carries a stall guard: bounded tasks, no watch-mode command, report up rather than wait.

## User-facing text gets a second review

Only user-facing text waits on the user: site labels and copy, README, and docs written for a person to
read. The user reviews each such sentence or paragraph before it is committed.

Everything else lands on the tech lead's own review, with no user approval: rule, skill and memory files,
`decisions.yml` and config comments, code comments, docstrings, commit messages, test fixtures, ledger and
tracker entries, and the agent's self-evaluation log entries.

The tech lead lists each new or changed piece of user-facing text word for word, says where it appears, and
waits for the user's yes. A plan that quotes the text and is approved counts as that review. User-facing
text an engineer wrote that was not in the plan is listed after the diff review and held until approved.

## Model rule

**Subagents are never Fable** — Fable is reserved for the orchestrating session. Team leads are Opus,
engineers are Sonnet, or Haiku under the tier tests, pinned explicitly in their agent definitions. Never pass `model: "fable"` on an
Agent call for a subagent, and never `model: inherit` in an agent definition — `inherit` would silently
become Fable when the session itself is on Fable.

## Agent definitions

Roles are enforced as custom agent definitions, not prose only: `~/.claude/agents/team-lead.md` and
`~/.claude/agents/engineer.md` and `~/.claude/agents/engineer-haiku.md`. Spawn with `subagent_type:
"team-lead"` / `"engineer"` / `"engineer-haiku"` — never spawn a lead with a generic agent plus a
`model: "opus"` override.

**Enforced by frontmatter:** the model pin (Opus lead, Sonnet `engineer`, Haiku `engineer-haiku`); `Write`/`Edit`/`NotebookEdit`
removed from the lead's tool list.

**Enforced by the `role_gate.py` PreToolUse hook**, wired once in `~/.claude/settings.json` (matcher
`Write|Edit|NotebookEdit|Bash|PowerShell`); settings hooks fire inside subagents and the script branches on the
`agent_type` field: the lead's and the engineer's Bash or PowerShell calls that write files are DENIED for both (engineers change files with Edit/Write only; inside a worktree the hook stops enforcing it, see below), and every state-changing git command is DENIED for both the
lead and the engineer, in Bash and in PowerShell alike. Read-only git stays allowed. The patterns and verbs are in `role_gate.py`'s docstring and constants. A main session (no `agent_type`) whose environment sets `FACTORY_ROLE=team-lead` (a cloud routine playing the team lead, which has no Agent-spawned lead) gets the team lead's denies; `agent_type` still wins for its subagents. Two more named denies, matched per command segment outside quoted text: any `land.py` call is DENIED for every role but the tech lead (it is the tech lead's local commit/push tool); and `factory_job.py` subcommands are DENIED per role — `engineer`/`engineer-haiku`: `publish`, `merge`, `claim`, `label`, `comment`, `digest`, `sync-main`; the `team-lead` agent: `publish`, `merge`, `sync-main`; the `FACTORY_ROLE` session: `merge` (it may `publish`). `approvals`, `parse-issue` and the other subcommands stay allowed for all. Raw git stays denied for every role under `FACTORY_ROLE`; there is no allowlist.

**Worktree engineer.** An interactive engineer whose brief edits only the session's launch repo is spawned with `isolation: "worktree"`. The Edit/Write-only rule still holds; `role_gate.py` stops denying a shell write inside the worktree, because a slip there reaches the main checkout only through the tech lead's review. The tech lead integrates by `land.py commit --repo <worktree>`, then `git cherry-pick <sha>` in the main checkout, then `git worktree remove`. The site repo stays in the primary checkout.

**A recipe routine runs as a team lead with no tech lead** (a cloud session with `FACTORY_ROLE=team-lead`). The recipe is the approved plan: the lead spawns `engineer` or `engineer-haiku` per the recipe's `recipe.yml tier:`, follows the Haiku escalation above (a failed `engineer-haiku` check re-runs once on `engineer`), and sends every GitHub write through `scripts/factory_job.py`, never raw git or `gh`.

**Moment-bound reminder** (the same hook's branch for a payload with no `agent_type`): the tech lead gets
a warn-only `additionalContext` note on its first `Write`/`Edit`/`NotebookEdit` of a session, pointing
back at this rule. It never denies — the tech lead may still make a trivial one-liner edit inline.

**Enforced by the `brief_gate.py` PreToolUse hook**, wired in `~/.claude/settings.json` with matcher `Agent`: a `team-lead`/`engineer` spawn with no `git status --short` paste in its prompt is DENIED (see "Briefs carry pasted state").

**Still convention, not enforcement:** any write path Bash or PowerShell could take that `role_gate.py` does not name (some obscure tool, a non-interactive editor invocation, etc.); and a lead spawning only
`engineer` agents, never a generic agent standing in for one (frontmatter has no way to restrict which
`subagent_type` a lead spawns).

**Verified by live probe, not by docs:** agent-frontmatter `hooks:` blocks did not fire in testing, so they are not used; any future change to enforcement wiring is confirmed by spawning an
agent and watching the deny land, never by reading the docs alone.

## What triggers it — non-trivial work only

Route through the full workflow when the task is **multi-step, design-bearing, or spans multiple files**
— i.e. real implementation. Spawn the Sonnet subagent with the approved plan as its brief.

**Runs inline (no subagent), by you directly:**
- trivial one-liners, typo/rename fixes, a single obvious edit
- pure reads, searches, questions, and explanations
- anything where a second competent agent given the same inputs would produce the same artifact AND it's a
  handful of lines

When unsure whether a task clears the bar, it does — plan it.

## Carve-outs (never delegate)

- **Never send a teach, an explanation, a coaching answer, or a spaced-repetition rep to a subagent** —
  those are the product, and they stay with the tech lead, inline.
- The answer-length cap, coaching depth, and register rules are unaffected by this workflow.
- The Review step is not optional: nothing lands unreviewed. The reviewer is the lead itself — the tech
  lead reviews the consolidated diff and a team lead reviews its engineers' diffs — before any commit/push.
