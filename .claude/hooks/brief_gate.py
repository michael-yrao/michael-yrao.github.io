"""PreToolUse hook (GLOBAL): deny a `team-lead` / `engineer` spawn whose brief carries no git-status paste.

Why this exists
----------------
~/.claude/rules/execution-workflow.md ("Briefs carry pasted state, never described state")
requires every brief to carry the `git status --short` output of each repo it names. A rule that
must fire at spawn time cannot live only in prose, so this hook checks the Agent call's prompt.

Behavior (tool "Agent", tool_input carries `subagent_type` and `prompt`):
- subagent_type other than "team-lead" / "engineer", or missing: silent.
- prompt with no git-status paste: DENY (exit 2). The reason is written to stdout as JSON and
  to stderr, so it reaches the model whichever channel the harness reads.
- prompt with a paste that names `michael-yrao.github.io` and runs the Angular CLI through a path that
  fails on this machine (`npm run lint|test`, `npx ng`, bare `ng ...`): DENY, naming the bootstrap commands.
  Fires only when sys.platform == "win32"; on Linux those commands are the correct path.
- team-lead prompt with a paste and a sentence that tells the lead to run/spawn/launch/start its engineers
  in the background (or `run_in_background: true`), with no negation or "foreground" in that sentence: DENY,
  citing agents/team-lead.md. Never fires for other subagent types.
- prompt with a paste and none of the above: allowed, with a warn-only reminder of the rest of the brief checklist.

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

GATED_SUBAGENT_TYPES = frozenset({"team-lead", "engineer"})
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
WARN_TEXT = (
    "Brief check: guard/validation logic is pasted as the function body, not grep hits; the brief names "
    "the tests to add and the full-suite command; counts come from a command that was run; "
    "load the write-brief skill before the next brief."
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


def has_bad_site_cli(prompt: str) -> bool:
    if sys.platform != WINDOWS_PLATFORM:  # read at call time so a test can patch it
        return False
    if SITE_REPO_MARKER not in prompt:
        return False
    return any(BAD_SITE_CLI_PATTERN.match(line.strip()) for line in prompt.splitlines())


def _is_background_order(sentence: str) -> bool:
    return bool(BACKGROUND_ORDER_PATTERN.search(sentence)) and not BACKGROUND_EXEMPT_PATTERN.search(sentence)


def has_background_engineer_order(prompt: str) -> bool:
    return any(
        _is_background_order(sentence)
        for line in prompt.splitlines()
        for sentence in SENTENCE_SPLIT_PATTERN.split(line)
    )


def decide(subagent_type: object, prompt: object) -> Decision | None:
    if subagent_type not in GATED_SUBAGENT_TYPES:
        return None
    text = prompt if isinstance(prompt, str) else ""
    if not has_status_paste(text):
        return Decision("deny", DENY_REASON)
    if has_bad_site_cli(text):
        return Decision("deny", SITE_CLI_DENY_REASON)
    if subagent_type == "team-lead" and has_background_engineer_order(text):
        return Decision("deny", BACKGROUND_DENY_REASON)
    return Decision("warn", WARN_TEXT)


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
    decision = decide(tool_input.get("subagent_type"), tool_input.get("prompt"))
    if decision is None:
        return
    sys.exit(_emit(decision))


if __name__ == "__main__":
    main()
