"""PreToolUse hook (GLOBAL): deny a `team-lead` / `engineer` spawn whose brief carries no git-status paste.

Why this exists
----------------
~/.claude/rules/execution-workflow.md ("Briefs carry pasted state, never described state")
requires every brief to carry the `git status --short` output of each repo it names. A rule that
must fire at spawn time cannot live only in prose, so this hook checks the Agent call's prompt.

Behavior (tool "Agent", tool_input carries `subagent_type`, `prompt` and optionally `model`; the
payload's top-level `agent_type` is the caller, absent for the main session). Checked first, for any
subagent_type:
- roster: the allowed types are the stems of the `*.md` files in the agents dir (sibling of hooks/) plus
  BUILTIN_ALLOWED (`statusline-setup`, `claude-code-guide`). A missing or empty
  subagent_type (the harness defaults it to general-purpose) and any other type: DENY. `Explore` names
  `researcher`, `Plan` names `planner`, `web-fetch` names `web-researcher`, any other reason lists the roster. A missing, unreadable or
  empty agents dir denies and points at bootstrap.py.
- `model` equal to "fable" (case-insensitive): DENY. Subagents are never Fable.
- a spawn of any dotfile persona (every stem in the agents dir) with any non-empty `model`: DENY. Their
  model is pinned in frontmatter.
- caller `agent_type` "team-lead" spawning anything but `engineer` / `engineer-haiku`: DENY. A lead
  spawns only engineers.
With no model and a main-session caller, the rules below apply unchanged. Then:
- an allowed subagent_type other than "team-lead" / "engineer" / "engineer-haiku": silent.
- prompt with no git-status paste: DENY (exit 2). The reason is written to stdout as JSON and
  to stderr, so it reaches the model whichever channel the harness reads.
- prompt with a paste whose `## branch...upstream` line (from `git status --short --branch`) shows
  `[behind N]` or `[ahead N, behind M]`: DENY, naming the line and telling the sender to fast-forward
  (`git merge --ff-only @{u}`) and re-paste. `[ahead N]` alone, a level branch and `## HEAD (no branch)` pass.
- prompt with a paste (otherwise allowed) that has no `## branch...upstream` line at all: the warn gains a line
  telling the sender to paste `git status --short --branch` or run `brief_state.py`. Never a deny.
- prompt with a paste that names `michael-yrao.github.io` and runs the Angular CLI through a path that
  fails on this machine (`npm run lint|test`, `npx ng`, bare `ng ...`): DENY, naming the bootstrap commands.
  Fires only when sys.platform == "win32"; on Linux those commands are the correct path.
- team-lead prompt with a paste and a sentence that tells the lead to run/spawn/launch/start its engineers
  in the background (or `run_in_background: true`), with no negation or "foreground" in that sentence: DENY,
  citing agents/team-lead.md. Never fires for other subagent types.
- team-lead prompt with a paste and no line `Lead because: width` or `Lead because: depth` (case-insensitive):
  DENY, citing the rule "Spawn rule: team leads are opt-in". Never fires for other subagent types.
- `engineer-haiku` prompt with a paste and no `Tier test N:` line (N = 1..5, non-blank after the colon) for any of the five tier tests: DENY, naming the missing numbers.
- prompt with a paste and none of the above: allowed, with a warn-only reminder of the rest of the brief checklist;
  when its Verify section holds a backticked command with no "unverified" mark and no ```output fence,
  the reminder gains one line (write-brief step 6); an engineer brief whose Verify section holds a
  backticked command with no `<...>` placeholder that role_gate.py denies that role gains a second line
  naming it (write-brief step 9). Never a deny.

A paste is either a `git status --short` line followed within STATUS_WINDOW_LINES lines by a
status row at column 0 (or a clean marker: `(clean)`, `(empty)`, `(empty — clean)`, `(nothing)`,
`(no output)`, or `clean` alone on a line), or a fenced block whose first inner line mentions `git status`
(which accepts a clean repo whose output is empty). Prose with inline backticks is not a paste.

Malformed/non-JSON stdin: silent, exit 0 — a hook must never break the tool it wraps.
"""
from __future__ import annotations  # keeps `X | None` annotations safe on Python < 3.10

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

try:  # sibling hook module: importable when run as a script from hooks/ or with hooks/ on sys.path
    import role_gate
except Exception:  # the check then stays silent; it must never break the gate
    role_gate = None

GATED_SUBAGENT_TYPES = frozenset({"team-lead", "engineer", "engineer-haiku"})
ENGINEER_SUBAGENT_TYPES = frozenset({"engineer", "engineer-haiku"})
AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"  # hooks/ and agents/ are siblings in both clones
BUILTIN_ALLOWED = frozenset({"statusline-setup", "claude-code-guide"})
ROSTER_DENY_REASON = (
    "Brief gate: ~/.claude/rules/execution-workflow.md \"Agent roster\": only dotfile agents spawn, and "
    "general-purpose agents are denied. Pick one of: {pick_one}."
)
ROSTER_MISSING_DENY_REASON = (
    "Brief gate: the agents directory next to hooks/ is missing, unreadable or empty, so no agent type can be "
    "checked. Restore it with `python <claude-dotfiles clone>/bootstrap.py`."
)
STAND_IN_REASONS = {
    "Explore": "Brief gate: the built-in `Explore` agent is denied; use `researcher` (read-only codebase sweep).",
    "Plan": "Brief gate: the built-in `Plan` agent is denied; use `planner` (read-only design).",
    "web-fetch": "Brief gate: the built-in `web-fetch` agent is denied; use `web-researcher` (reads pages and searches).",
}
FABLE_MODEL = "fable"
FABLE_DENY_REASON = (
    "Brief gate: ~/.claude/rules/execution-workflow.md \"Model rule\": subagents are never Fable. "
    "Drop `model: \"fable\"` (a sweep takes `sonnet`, design takes `opus`)."
)
PINNED_MODEL_DENY_REASON = (
    "Brief gate: a spawn of any dotfile agent (`team-lead`, `engineer`, `researcher`, `planner`, ...) carries no `model`: its model is pinned "
    "in the agent definition (~/.claude/rules/execution-workflow.md \"Agent definitions\"). Remove `model`."
)
LEAD_SPAWNS_ENGINEERS_DENY_REASON = (
    "Brief gate: a team lead spawns only `engineer` or `engineer-haiku` agents "
    "(~/.claude/rules/execution-workflow.md \"Agent definitions\"). Spawn an engineer instead."
)
STATUS_WINDOW_LINES = 20  # how far below the command line a status line may sit

STATUS_COMMAND_MARKER = "git status --short"
# A porcelain status row at column 0: a real XY code (at least one letter or `?`), one space, a path.
STATUS_LINE_PATTERN = re.compile(r"^(?:\?\?|[MADRCU][ MADRCU]|[ MADRCU][MADRCU]) \S")
# A clean-repo marker: `(clean)`, `(empty)`, `(empty — clean)`, `(empty - clean)`, `(nothing)`,
# `(no output)`, or `clean` alone on its line; case-insensitive, surrounding whitespace allowed.
CLEAN_LINE_PATTERN = re.compile(
    r"^\s*(?:\((?:clean|empty|nothing|no output|empty\s*[—–-]+\s*clean)\)|clean)\s*$",
    re.IGNORECASE,
)
FENCE_MARKER = "```"
FENCE_COMMAND_PATTERN = re.compile(r"git status")
# git's `--branch` header: `## main...origin/main [ahead 1, behind 2]`, `## HEAD (no branch)`, or an unborn branch.
BRANCH_LINE_PATTERN = re.compile(
    r"^## (?:\S+\.\.\.\S+(?: \[[^\]]*\])?|HEAD \(no branch\)|(?:No commits yet|Initial commit) on \S+)\s*$"
)
BEHIND_LINE_PATTERN = re.compile(r"^## .*\[(?:ahead \d+, )?behind \d+\]\s*$")
STALE_DENY_REASON = (
    "Brief gate: ~/.claude/rules/execution-workflow.md \"Briefs carry pasted state\": the paste shows a repo "
    "behind its upstream (`{line}`), so the brief would send an engineer onto stale code. Fast-forward it "
    "(`git merge --ff-only @{{u}}`), re-run `git status --short --branch` and paste the fresh output."
)
BRANCH_WARN_TEXT = (
    " The status paste has no `## branch...upstream` line: paste `git status --short --branch` (or run "
    "`python ~/.claude/scripts/brief_state.py <repo…>`) so a repo behind its upstream shows."
)

DENY_REASON = (
    "Brief gate: ~/.claude/rules/execution-workflow.md says \"Every repo a plan or brief names gets its "
    "`git status --short` output **pasted into the brief**\", and this prompt has no such paste. Re-run "
    "`git status --short` in each repo the brief names and paste its output (or `(clean)` / `(empty)` / `(nothing)` / `(no output)`) under a line "
    "containing `git status --short`, or in a fenced block whose first line is the command."
)
SITE_REPO_MARKER = "michael-yrao.github.io"
WINDOWS_PLATFORM = "win32"  # the site-CLI deny applies only where Node 24.9 is refused
# A line that starts (after an optional `$ ` / `> ` prompt) with an Angular CLI entry that fails here.
BAD_SITE_CLI_PATTERN = re.compile(
    r"^(?:[$>]\s+)?(?:npm run lint|npm run test|npx ng|ng test|ng lint|ng build|ng serve)\b"
)
SITE_CLI_DENY_REASON = (
    "Brief gate: this brief names michael-yrao.github.io and runs the Angular CLI through a path that fails "
    "on this machine: Node 24.9 is refused by the Angular CLI wrapper (\"requires v24.15.0\"). Use the "
    "bootstrap path instead: `node node_modules/@angular/cli/bin/bootstrap.js test --watch=false` and "
    "`node node_modules/@angular/cli/bin/bootstrap.js lint` (memory: site-repo-node-toolchain)."
)
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")
# An imperative run/spawn/launch/start verb followed, in the same sentence, by "in the background",
# or a literal `run_in_background: true` / `run_in_background=true`.
BACKGROUND_ORDER_PATTERN = re.compile(
    r"\b(?:run|spawn|launch|start)\b[^.!?\n]*\bin the background\b|\brun_in_background\s*[:=]\s*true\b",
    re.IGNORECASE,
)
# A negation or "foreground" in the same sentence turns the instruction into an allowed one.
BACKGROUND_EXEMPT_PATTERN = re.compile(r"\b(?:do not|don't|don’t|dont|never|not|foreground)\b", re.IGNORECASE)
BACKGROUND_DENY_REASON = (
    "Brief gate: this team-lead brief tells the lead to run its engineers in the background, but "
    "~/.claude/agents/team-lead.md requires engineers to be spawned with `run_in_background: false`: a "
    "lead's turn that ends while its engineers still run is handed back with no diff. Rewrite the brief "
    "so the lead spawns its engineers in the foreground."
)
LEAD_REASON_PATTERN = re.compile(r"^\s*Lead because:\s*(?:width|depth)\b", re.IGNORECASE | re.MULTILINE)
LEAD_REASON_DENY_REASON = (
    "Brief gate: ~/.claude/rules/execution-workflow.md \"Spawn rule: team leads are opt-in\" makes a team "
    "lead an extra layer that the plan must justify, and this team-lead brief has no `Lead because: width` "
    "or `Lead because: depth` line. If the plan names neither reason, do not spawn a lead: the tech lead "
    "briefs the engineers itself."
)
TIER_TEST_PATTERN = re.compile(r"^\s*Tier test ([1-5]):[ \t]*\S", re.IGNORECASE | re.MULTILINE)
TIER_TESTS = frozenset("12345")
TIER_DENY_REASON = (
    "Brief gate: an `engineer-haiku` brief states all five tier tests from execution-workflow.md "
    "\"Engineer tier\", one line each, `Tier test 1:` through `Tier test 5:`, each saying how the "
    "test holds. Missing: {missing}. If any test does not hold, spawn `engineer` (Sonnet) instead."
)
# A fix sent/routed/returned/given (back) to "the same engineer" / "that engineer", or the old engineer
# resumed or SendMessage'd for a fix, all within one sentence.
SAME_ENGINEER_FIX_PATTERN = re.compile(
    r"\bfix(?:es)?\b[^.!?\n]*\b(?:to|back to|with)\s+(?:the same|that) engineer\b"
    r"|\b(?:send|route|return|give|resume|sendmessage)\b[^.!?\n]*\b(?:the same|that|the old) engineer\b[^.!?\n]*\bfix",
    re.IGNORECASE,
)
# "fresh", "new" or a negation in the same sentence turns the instruction into an allowed one.
SAME_ENGINEER_EXEMPT_PATTERN = re.compile(r"\b(?:fresh|new|never|do not|don't|don’t|dont)\b", re.IGNORECASE)
SAME_ENGINEER_DENY_REASON = (
    "Brief gate: this team-lead brief sends fixes back to the same engineer, but "
    "~/.claude/agents/team-lead.md requires a fix to go to a fresh `engineer` spawned with "
    "`run_in_background: false`: a SendMessage resumes the old engineer in the background and leaves the "
    "lead nothing to block on. Rewrite the brief so each fix goes to a fresh foreground engineer."
)
WARN_TEXT = (
    "Brief check: guard/validation logic is pasted as the function body, not grep hits; a guard, filter or join "
    "brief states the input it must still accept and the key it joins on; the brief names "
    "the tests to add and the full-suite command; counts come from a command that was run; "
    "load the write-brief skill before the next brief."
)
VERIFY_HEADING_PATTERN = re.compile(r"^(?:\d+\.\s*)?verif(?:y|ication)\b", re.IGNORECASE)
HEADING_STRIP_CHARS = "#* \t"
UNVERIFIED_PATTERN = re.compile(r"unverified", re.IGNORECASE)
OUTPUT_FENCE_PATTERN = re.compile(r"^\s*```output\b")
INLINE_CODE_MARKER = "`"
HEADING_PREFIX = "#"
VERIFY_WARN_TEXT = (
    " A verify command needs pasted output or an *(expected, unverified)* mark (write-brief step 6)."
)
INLINE_CODE_PATTERN = re.compile(r"`([^`\n]+)`")
PLACEHOLDER_PATTERN = re.compile(r"<[^<>\s]+>")
ROLE_DENY_WARN_TEXT = (
    " This brief names {commands}, which role_gate.py denies the {role} role; "
    "run it yourself or drop it from the brief (write-brief step 9)."
)


@dataclass(frozen=True)
class Decision:
    """An immutable PreToolUse verdict: "deny" blocks the call, "warn" only injects context."""

    kind: str  # "deny" or "warn"
    reason: str


def _is_status_row(line: str) -> bool:
    return bool(STATUS_LINE_PATTERN.match(line)) or bool(CLEAN_LINE_PATTERN.match(line))


def _has_command_then_status(lines: list[str]) -> bool:
    for index, line in enumerate(lines):
        if STATUS_COMMAND_MARKER not in line:
            continue
        window = lines[index + 1 : index + 1 + STATUS_WINDOW_LINES]
        if any(_is_status_row(candidate) for candidate in window):
            return True
    return False


def _has_status_fence(lines: list[str]) -> bool:
    for index, line in enumerate(lines[:-1]):
        if line.strip().startswith(FENCE_MARKER) and FENCE_COMMAND_PATTERN.search(lines[index + 1]):
            return True
    return False


def has_status_paste(prompt: str) -> bool:
    lines = prompt.splitlines()
    return _has_command_then_status(lines) or _has_status_fence(lines)


def behind_branch_line(prompt: str) -> str | None:
    """The first `## ...[behind N]` line in the prompt, or None."""
    return next((line.strip() for line in prompt.splitlines() if BEHIND_LINE_PATTERN.match(line.strip())), None)


def has_branch_line(prompt: str) -> bool:
    return any(BRANCH_LINE_PATTERN.match(line.strip()) for line in prompt.splitlines())


def missing_tier_tests(prompt: str) -> list[str]:
    return sorted(TIER_TESTS - set(TIER_TEST_PATTERN.findall(prompt)))


def has_bad_site_cli(prompt: str) -> bool:
    if sys.platform != WINDOWS_PLATFORM:  # read at call time so a test can patch it
        return False
    if SITE_REPO_MARKER not in prompt:
        return False
    return any(BAD_SITE_CLI_PATTERN.match(line.strip()) for line in prompt.splitlines())


def _is_background_order(sentence: str) -> bool:
    return bool(BACKGROUND_ORDER_PATTERN.search(sentence)) and not BACKGROUND_EXEMPT_PATTERN.search(sentence)


def _is_same_engineer_fix_order(sentence: str) -> bool:
    return bool(SAME_ENGINEER_FIX_PATTERN.search(sentence)) and not SAME_ENGINEER_EXEMPT_PATTERN.search(sentence)


def _any_sentence(prompt: str, predicate) -> bool:
    return any(
        predicate(sentence)
        for line in prompt.splitlines()
        for sentence in SENTENCE_SPLIT_PATTERN.split(line)
    )


def has_background_engineer_order(prompt: str) -> bool:
    return _any_sentence(prompt, _is_background_order)


def has_same_engineer_fix_order(prompt: str) -> bool:
    return _any_sentence(prompt, _is_same_engineer_fix_order)


def _is_verify_heading(line: str) -> bool:
    return bool(VERIFY_HEADING_PATTERN.match(line.strip().lstrip(HEADING_STRIP_CHARS)))


def _verify_sections(lines: list[str]) -> list[list[str]]:
    """Each Verify section: its heading line to the next `#` heading outside a fence, or the end."""
    sections: list[list[str]] = []
    current: list[str] | None = None
    is_in_fence = False
    for line in lines:
        if line.strip().startswith(FENCE_MARKER):
            is_in_fence = not is_in_fence
        is_heading = not is_in_fence and line.lstrip().startswith(HEADING_PREFIX)
        if current is not None and is_heading:
            current = None
        if current is None and _is_verify_heading(line):
            current = []
            sections.append(current)
        if current is not None:
            current.append(line)
    return sections


def _is_unmarked_verify_command(section: list[str]) -> bool:
    text = "\n".join(section)
    if INLINE_CODE_MARKER not in text or UNVERIFIED_PATTERN.search(text):
        return False
    return not any(OUTPUT_FENCE_PATTERN.match(line) for line in section)


def has_unmarked_verify_command(prompt: str) -> bool:
    return any(_is_unmarked_verify_command(s) for s in _verify_sections(prompt.splitlines()))


def _inline_code_spans(prompt: str) -> list[str]:
    """Single-line backtick spans with no `<word>` placeholder, outside ``` fences, inside a Verify section, in brief order, each once."""
    spans: list[str] = []
    for section in _verify_sections(prompt.splitlines()):
        spans.extend(_section_code_spans(section))
    return list(dict.fromkeys(span for span in spans if span and not PLACEHOLDER_PATTERN.search(span)))


def _section_code_spans(lines: list[str]) -> list[str]:
    spans: list[str] = []
    is_in_fence = False
    for line in lines:
        if line.strip().startswith(FENCE_MARKER):
            is_in_fence = not is_in_fence
            continue
        if is_in_fence:
            continue
        spans.extend(span.strip() for span in INLINE_CODE_PATTERN.findall(line))
    return spans


def _is_role_denied(subagent_type: str, command: str) -> bool:
    payload = {"agent_type": subagent_type, "tool_name": "Bash", "tool_input": {"command": command}}
    try:
        verdict = role_gate.decide(payload)
    except Exception:  # a hook must never break the gate it warns for
        return False
    return verdict is not None and verdict.kind == "deny"


def role_denied_commands(subagent_type: object, prompt: str) -> list[str]:
    """Inline backticked commands that role_gate.py would deny the engineer role; empty when it can't be imported."""
    if role_gate is None or subagent_type not in ENGINEER_SUBAGENT_TYPES:
        return []
    return [span for span in _inline_code_spans(prompt) if _is_role_denied(str(subagent_type), span)]


def _role_deny_parts(subagent_type: object, prompt: str) -> tuple[str, ...]:
    commands = role_denied_commands(subagent_type, prompt)
    if not commands:
        return ()
    named = ", ".join(f"`{command}`" for command in commands)
    return (ROLE_DENY_WARN_TEXT.format(commands=named, role=subagent_type),)


def _read_roster(agents_dir: Path) -> frozenset[str] | None:
    """Stems of the `*.md` agent definitions in `agents_dir`; None when the directory is unreadable or empty."""
    try:
        stems = frozenset(path.stem for path in agents_dir.glob("*.md"))
    except OSError:
        return None
    return stems or None


def _roster_denial(subagent_type: object, roster: frozenset[str] | None) -> Decision | None:
    if roster is None:
        return Decision("deny", ROSTER_MISSING_DENY_REASON)
    if isinstance(subagent_type, str) and (subagent_type in roster or subagent_type in BUILTIN_ALLOWED):
        return None
    pick_one = ", ".join(sorted(roster | BUILTIN_ALLOWED))
    if isinstance(subagent_type, str) and subagent_type in STAND_IN_REASONS:
        return Decision("deny", STAND_IN_REASONS[subagent_type])
    return Decision("deny", ROSTER_DENY_REASON.format(pick_one=pick_one))


def _model_or_caller_denial(
    subagent_type: object, model: object, caller: object, roster: frozenset[str]
) -> Decision | None:
    if isinstance(model, str) and model.strip().lower() == FABLE_MODEL:
        return Decision("deny", FABLE_DENY_REASON)
    if subagent_type in roster and isinstance(model, str) and model.strip():
        return Decision("deny", PINNED_MODEL_DENY_REASON)
    if caller == "team-lead" and subagent_type not in ENGINEER_SUBAGENT_TYPES:
        return Decision("deny", LEAD_SPAWNS_ENGINEERS_DENY_REASON)
    return None


def decide(
    subagent_type: object,
    prompt: object,
    model: object = None,
    caller: object = None,
    agents_dir: Path = AGENTS_DIR,
) -> Decision | None:
    roster = _read_roster(agents_dir)
    denial = _roster_denial(subagent_type, roster) or _model_or_caller_denial(
        subagent_type, model, caller, roster
    )
    if denial is not None:
        return denial
    if subagent_type not in GATED_SUBAGENT_TYPES:
        return None
    text = prompt if isinstance(prompt, str) else ""
    if not has_status_paste(text):
        return Decision("deny", DENY_REASON)
    behind_line = behind_branch_line(text)
    if behind_line is not None:
        return Decision("deny", STALE_DENY_REASON.format(line=behind_line))
    if has_bad_site_cli(text):
        return Decision("deny", SITE_CLI_DENY_REASON)
    if subagent_type == "team-lead" and not LEAD_REASON_PATTERN.search(text):
        return Decision("deny", LEAD_REASON_DENY_REASON)
    if subagent_type == "team-lead" and has_background_engineer_order(text):
        return Decision("deny", BACKGROUND_DENY_REASON)
    if subagent_type == "team-lead" and has_same_engineer_fix_order(text):
        return Decision("deny", SAME_ENGINEER_DENY_REASON)
    if subagent_type == "engineer-haiku" and (missing := missing_tier_tests(text)):
        return Decision("deny", TIER_DENY_REASON.format(missing=", ".join(missing)))
    return Decision("warn", "".join(_warn_parts(subagent_type, text)))


def _warn_parts(subagent_type: object, text: str) -> tuple[str, ...]:
    verify_part = (VERIFY_WARN_TEXT,) if has_unmarked_verify_command(text) else ()
    branch_part = () if has_branch_line(text) else (BRANCH_WARN_TEXT,)
    return (WARN_TEXT, *verify_part, *branch_part, *_role_deny_parts(subagent_type, text))


def _emit(decision: Decision) -> int:
    if decision.kind == "deny":
        json.dump(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": decision.reason,
                }
            },
            sys.stdout,
        )
        print(decision.reason, file=sys.stderr)
        return 2
    json.dump(
        {"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": decision.reason}},
        sys.stdout,
    )
    return 0


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return  # malformed input is not this hook's problem — stay silent, exit 0
    if not isinstance(payload, dict):
        return
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return
    decision = decide(
        tool_input.get("subagent_type"),
        tool_input.get("prompt"),
        tool_input.get("model"),
        payload.get("agent_type"),
    )
    if decision is None:
        return
    sys.exit(_emit(decision))


if __name__ == "__main__":
    main()
