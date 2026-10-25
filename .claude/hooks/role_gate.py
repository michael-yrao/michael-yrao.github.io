"""PreToolUse hook (GLOBAL): enforce the tech-lead/team-lead/engineer pyramid at the tool level.

Why this exists
----------------
~/.claude/rules/execution-workflow.md defines a three-tier pyramid: the tech lead (this
session) plans/reviews/integrates but never writes implementation; a `team-lead` agent
supervises up to five engineers but never writes or commits; an `engineer` or `engineer-haiku`
agent implements but never commits and never writes through a shell. Agent frontmatter (`disallowedTools`) already removes Write/Edit/
NotebookEdit from `team-lead`, but a shell (Bash or PowerShell) can still write a file
(`sed -i`, `tee`, a redirect, a heredoc, an inline `python -c` write, a PowerShell write
cmdlet) or run a state-changing git command, and frontmatter has no way to gate *inside* a
shell. This hook is that gate.

What is enforced vs. what stays convention
-------------------------------------------
Only the NAMED patterns below (WRITE_PATTERNS, GIT_PATTERNS) are denied, in Bash and in
PowerShell alike. A shell write that
doesn't match any named pattern (some obscure tool, an editor invoked non-interactively,
etc.) is still convention, not enforcement — see the "still convention" note in
~/.claude/rules/execution-workflow.md. This hook does not parse shell syntax; it matches
command words and well-known write idioms, deliberately not a full parser.

Behavior by `agent_type` (present only when this fires inside a subagent):
- "team-lead": deny Write/Edit/NotebookEdit outright (belt and braces); deny Bash or
  PowerShell when the command matches a WRITE_PATTERN or a GIT_PATTERN.
- "engineer" and "engineer-haiku" (same rules): deny Bash or PowerShell when the command matches a GIT_PATTERN (never commit/push) or a
  WRITE_PATTERN (engineers change files with the Edit and Write tools only, never through a shell).
  Write/Edit/NotebookEdit tool calls stay allowed.
  Worktree rule: when the payload's `cwd` sits inside a LINKED git worktree (the nearest `.git` is a
  file whose `gitdir:` line has a `worktrees` segment; read without a subprocess), a WRITE_PATTERN match
  is NOT denied, provided the command names no path outside that worktree. Outside means an absolute
  POSIX path or a Windows drive path not under the worktree root (compared both as given and
  symlink-resolved), `~`, `$HOME`/`$OLDPWD`/`$TMPDIR`/`$env:X`/`%X%`, a bare `cd` (or `cd -`), or any `..` segment. `/dev/null` and paths under
  the payload's `scratchpad_dir` are exempt. A `.git` directory (the primary checkout), a submodule
  gitdir, or an unreadable cwd gives no exemption. GIT_PATTERNS and the factory denies below always
  apply, worktree or not; team-lead and FACTORY_ROLE sessions never get the exemption.

Deny patterns, described here and nowhere else (rule files point at this docstring and its constants):
- shell writes (WRITE_PATTERN_CHECKS): `sed -i`; `tee`; cp/mv/rm/touch/mkdir/rmdir; PowerShell write
  cmdlets and aliases (Set-Content, Out-File, New-Item, Remove-Item, ...); `-OutFile`; a .NET
  File/Directory write; output redirection (`>`, `>>`, except to /dev/null, $null, &1, &2); a heredoc
  `<<`; an inline `python -c` that opens a file for writing or calls a write API.
- state-changing git: the verbs in GIT_STATE_CHANGE_SUBCOMMANDS (read-only forms such as `git stash
  list` and a bare `git tag` stay allowed), matched outside quoted text, after any `-C <path>` flags.
- absent (the main session, i.e. the tech lead): never deny; on the session's FIRST
  Write/Edit/NotebookEdit, emit a one-time WARN reminder that real implementation belongs to
  an `engineer` agent, not the tech lead. Tracked via a per-session marker file so the warn
  fires once, not on every write.
  Exception: when the environment variable FACTORY_ROLE is "team-lead" (a cloud routine whose
  main session plays the team lead), the absent case gets the team-lead rules instead.
  `agent_type`, when present, always wins.
- land.py and factory_job.py (named-pattern denies, matched per command segment outside quoted text,
  any python/python3 invocation or path prefix; no allowlist, raw git stays denied):
  every role but the tech lead is denied any `land.py` call (it is the tech lead's local commit/push
  tool). factory_job.py subcommands denied per role: engineer/engineer-haiku publish, merge, claim,
  label, comment, digest, sync-main; the `team-lead` agent publish, merge, sync-main; the FACTORY_ROLE
  main session merge (it may publish and run sync-main, which its build routine needs: sync-main runs
  `git checkout -B main FETCH_HEAD` and so drops unpushed local main commits). Other subcommands (approvals, parse-issue, ...) stay allowed for everyone.
- any other agent_type (e.g. a plain "Explore" subagent): silent — this hook only governs
  the pyramid roles.

Unreliable measurement (warn-only, every pyramid role and the main session, Bash and PowerShell):
a command matching a row of UNRELIABLE_MEASUREMENTS (today: `grep` for `$'\r'`, which returned the
line count on this machine's Git Bash) gets an `additionalContext` note naming a reliable
measurement. It applies only when no deny applies; a deny always wins. It never denies.

Malformed/non-JSON stdin: silent, exit 0 — a hook must never break the tool it wraps.
"""
from __future__ import annotations  # keeps `X | None` annotations safe on Python < 3.10

import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

RULE_FILE = "~/.claude/rules/execution-workflow.md"

FACTORY_ROLE_ENV = "FACTORY_ROLE"
FACTORY_ROLE_TEAM_LEAD = "team-lead"
ENGINEER_AGENT_TYPES = frozenset({"engineer", "engineer-haiku"})
WRITE_TOOL_NAMES = frozenset({"Write", "Edit", "NotebookEdit"})
SHELL_TOOL_NAMES = frozenset({"Bash", "PowerShell"})

TECH_LEAD_WARN_TEXT = (
    "This is the first file write of the session by the tech lead. Per "
    f"{RULE_FILE} the tech lead never writes implementation — only trivial "
    "one-liners run inline. If this is real implementation, stop and route it "
    "to a Sonnet `engineer` agent."
)


@dataclass(frozen=True)
class Decision:
    """An immutable PreToolUse verdict: "deny" blocks the call, "warn" only injects context."""

    kind: str  # "deny" or "warn"
    reason: str


# --- shell-command helpers -------------------------------------------------

# Splits a command into segments at ; && || | ( { and a newline so a "command word" check anchors
# at each segment's start rather than matching the word inside an argument or path.
SEGMENT_SPLIT_PATTERN = re.compile(r";|&&|\|\||\||\(|\{|\n")


QUOTED_STRING_PATTERN = re.compile(r"""'[^']*'|"(?:\\.|[^"\\])*\"""")


def _without_quoted(command: str) -> str:
    """Blank quoted strings: quoted text is data, never a command start."""
    return QUOTED_STRING_PATTERN.sub(lambda match: match.group()[0] * 2, command)


def _segments(command: str) -> tuple[str, ...]:
    segments = SEGMENT_SPLIT_PATTERN.split(_without_quoted(command))
    return tuple(segment.strip() for segment in segments if segment.strip())


# --- WRITE_PATTERNS: Bash idioms that create, modify, or delete a file -----

SED_INPLACE_PATTERN = re.compile(r"^sed\b.*-i\b", re.IGNORECASE)  # in-place stream-edit rewrites the target file
TEE_PATTERN = re.compile(r"^tee\b", re.IGNORECASE)  # tee writes stdin to a file
FILE_CMD_PATTERN = re.compile(r"^(?:cp|mv|rm|touch|mkdir|rmdir)\b", re.IGNORECASE)  # directly create/move/delete files
PS_WRITE_PATTERN = re.compile(
    r"^(?:Set-Content|Add-Content|Clear-Content|Out-File|New-Item|Remove-Item|Copy-Item|Move-Item"
    r"|Rename-Item|Set-ItemProperty|Export-Csv|Export-Clixml|Tee-Object|Start-Transcript"
    r"|Expand-Archive|Compress-Archive"
    r"|sc|ac|clc|ni|ri|del|erase|rd|cpi|copy|mi|move|rni|ren|md)(?![\w-])",
    re.IGNORECASE,
)  # PowerShell cmdlets (and their aliases) that create, modify, or delete files
PS_OUTFILE_PATTERN = re.compile(r"-OutFile\b", re.IGNORECASE)  # a download written to disk (Invoke-WebRequest)
DOTNET_WRITE_PATTERN = re.compile(
    r"\[(?:System\.)?IO\.(?:File|Directory)\]::(?:Write|Append|Create|Delete|Move|Copy)\w*",
    re.IGNORECASE,
)  # a .NET static call that writes, moves, or deletes a file or directory
REDIRECT_PATTERN = re.compile(r">{1,2}(?!\s*(?:&[12]\b|/dev/null\b|\$null\b))")  # output redirection, except >/dev/null, >$null, >&1, >&2
QUOTED_LITERAL_PATTERN = re.compile(r'"(?:\\.|""|[^"\\])*"|\'(?:\'\'|[^\'])*\'')  # a "..." (backslash or "" escapes) or '...' (the '' escape) literal
_EMPTY_LITERAL = lambda match: match.group(0)[0] * 2  # noqa: E731  keep the quotes, drop the contents
NON_REDIRECT_OPERATOR_PATTERN = re.compile(r"=>|->|>=")  # arrow and comparison operators whose > is not a redirect (<> is bash's read-write redirect, kept denied)
HEREDOC_PATTERN = re.compile(r"<<")  # heredoc: writes inline content, typically into a redirected file
PYTHON_INLINE_PATTERN = re.compile(r"python3?\s+-c\b")  # an inline python one-liner (python -c "...")
WRITE_CALL_PATTERN = re.compile(
    r"open\([^)]*[\"'](?:w|a|x)[\w+]{0,2}[\"']|write_text|WriteAllText|WriteAllLines",
    re.IGNORECASE,
)  # the inline code opens a file for writing/appending, or calls a write-file API


def _is_sed_inplace(command: str) -> bool:
    return any(SED_INPLACE_PATTERN.match(segment) for segment in _segments(command))


def _is_tee(command: str) -> bool:
    return any(TEE_PATTERN.match(segment) for segment in _segments(command))


def _is_file_cmd(command: str) -> bool:
    return any(FILE_CMD_PATTERN.match(segment) for segment in _segments(command))


def _is_ps_write_cmdlet(command: str) -> bool:
    return any(PS_WRITE_PATTERN.match(segment) for segment in _segments(command))


def _has_ps_outfile(command: str) -> bool:
    return bool(PS_OUTFILE_PATTERN.search(command))


def _has_dotnet_write(command: str) -> bool:
    return bool(DOTNET_WRITE_PATTERN.search(command))


def _has_redirect(command: str) -> bool:
    unquoted = QUOTED_LITERAL_PATTERN.sub(_EMPTY_LITERAL, command)
    return bool(REDIRECT_PATTERN.search(NON_REDIRECT_OPERATOR_PATTERN.sub("", unquoted)))


def _has_heredoc(command: str) -> bool:
    return bool(HEREDOC_PATTERN.search(command))


def _is_python_inline_write(command: str) -> bool:
    return bool(PYTHON_INLINE_PATTERN.search(command)) and bool(WRITE_CALL_PATTERN.search(command))


# Ordered (name, check) pairs; the name is what a deny reason cites as "matched: <name>".
WRITE_PATTERN_CHECKS = (
    ("sed -i", _is_sed_inplace),
    ("tee", _is_tee),
    ("cp/mv/rm/touch/mkdir/rmdir", _is_file_cmd),
    ("PowerShell write cmdlet", _is_ps_write_cmdlet),
    ("-OutFile", _has_ps_outfile),
    (".NET file write", _has_dotnet_write),
    (">", _has_redirect),
    ("heredoc <<", _has_heredoc),
    ("python -c write", _is_python_inline_write),
)


def _matched_write_pattern(command: str) -> str | None:
    for name, check in WRITE_PATTERN_CHECKS:
        if check(command):
            return name
    return None


# --- GIT_PATTERNS: state-changing git subcommands (read-only git stays allowed) ---

GIT_STATE_CHANGE_SUBCOMMANDS = (
    "add", "commit", "push", "rm", "mv", "reset", "restore",
    "stash", "rebase", "merge", "cherry-pick", "tag", "checkout",
    "pull", "fetch", "switch", "clean", "revert", "am", "apply", "worktree",
)
GIT_READ_ONLY_STASH_LOOKAHEAD = r"(?!\s+(?:list|show)\b)"  # `git stash list` / `git stash show` only read
GIT_READ_ONLY_TAG_LOOKAHEAD = r"(?!\s*(?:$|[|;&)]|-l\b|--list\b))"  # bare tag, or tag -l / --list, only reads
GIT_MERGE_FILE_LOOKAHEAD = r"(?!-file\b)"  # `git merge-file` only writes the working file it is given
GIT_READ_ONLY_LOOKAHEADS = {
    "merge": GIT_MERGE_FILE_LOOKAHEAD,
    "stash": GIT_READ_ONLY_STASH_LOOKAHEAD,
    "tag": GIT_READ_ONLY_TAG_LOOKAHEAD,
}
GIT_STATE_CHANGE_PATTERN = re.compile(
    r"\bgit\b(?:\s+-[A-Za-z]\s+\S+|\s+--\S+)*\s+("
    + "|".join(
        name + GIT_READ_ONLY_LOOKAHEADS.get(name, "")
        for name in GIT_STATE_CHANGE_SUBCOMMANDS
    )
    + r")\b",
    re.IGNORECASE,
)  # git, optional flags (e.g. -C <path>), then a state-changing subcommand


def _matched_git_pattern(command: str) -> str | None:
    """Match a state-changing git verb outside quoted text.

    Quoted strings are data and ignored. A heredoc BODY is still matched
    (known gap: the module does no shell parsing).
    """
    match = GIT_STATE_CHANGE_PATTERN.search(_without_quoted(command))
    return match.group(1) if match else None


def _shell_command(tool_input: dict) -> str:
    return str(tool_input.get("command", "") or "")


# --- FACTORY_TOOL denies: land.py and the GitHub-write subcommands of factory_job.py ---

LAND_PATTERN = re.compile(r"^(?:python3?\s+(?:-\S+\s+)*)?\S*land\.py\b", re.IGNORECASE)  # a land.py call, any path prefix
FACTORY_JOB_PATTERN = re.compile(
    r"^(?:python3?\s+(?:-\S+\s+)*)?\S*factory_job\.py\s+([\w-]+)", re.IGNORECASE
)  # a factory_job.py call; group 1 is its subcommand
ENGINEER_BLOCKED_FACTORY_JOB = frozenset({"publish", "merge", "claim", "label", "comment", "digest", "sync-main"})
TEAM_LEAD_AGENT_BLOCKED_FACTORY_JOB = frozenset({"publish", "merge", "sync-main"})
FACTORY_SESSION_BLOCKED_FACTORY_JOB = frozenset({"merge"})


def _is_land_call(command: str) -> bool:
    return any(LAND_PATTERN.match(segment) for segment in _segments(command))


def _blocked_factory_job_subcommand(command: str, blocked: frozenset) -> str | None:
    for segment in _segments(command):
        match = FACTORY_JOB_PATTERN.match(segment)
        if match and match.group(1).lower() in blocked:
            return match.group(1).lower()
    return None


def _factory_tool_denial(command: str, role: str, blocked_factory_job: frozenset) -> Decision | None:
    """Deny land.py (the tech lead's tool) and the factory_job.py subcommands blocked for `role`."""
    if _is_land_call(command):
        return Decision(
            "deny",
            f"{role} never runs land.py (matched: land.py); see {RULE_FILE} — "
            "landing a commit or push is the tech lead's job",
        )
    subcommand = _blocked_factory_job_subcommand(command, blocked_factory_job)
    if subcommand:
        return Decision(
            "deny",
            f"{role} never runs factory_job.py {subcommand} (matched: factory_job.py {subcommand}); "
            f"see {RULE_FILE} — that GitHub write belongs to another role",
        )
    return None


# --- linked-worktree exemption: an engineer's shell write inside its own worktree is allowed ---

GITDIR_LINE_PATTERN = re.compile(r"^\s*gitdir:\s*(.+?)\s*$", re.MULTILINE)
WORKTREES_SEGMENT_PATTERN = re.compile(r"[/\\]worktrees[/\\]")  # a linked worktree's gitdir, not .git/modules/…
DEV_NULL = "/dev/null"
# Path tokens that leave the worktree. Each lookbehind anchors a token start (not the middle of `s/a/b/`).
TOKEN_START = r"(?:^|(?<=[\s\"'=<>(;&|]))"
ABSOLUTE_POSIX_PATH_PATTERN = re.compile(TOKEN_START + r"(/[^\s\"'`;&|<>()]*)")
WINDOWS_DRIVE_PATH_PATTERN = re.compile(TOKEN_START + r"([A-Za-z]:[\\/][^\s\"'`;&|<>()]*)")
ALWAYS_OUTSIDE_PATTERN = re.compile(
    r"(?:(?<![\w])~(?=$|[/\\\s\"';&|)]))"  # ~ or ~/…
    r"|\$\{?(?:HOME|OLDPWD|TMPDIR|(?i:env):\w+)\b\}?|%\w+%"  # shell, PowerShell and cmd variables
    r"|(?:^|(?<=[;&|(\s]))(?:cd|pushd|chdir|(?i:set-location|sl))"  # cd with no argument or `-`
    r"(?:\s*(?=$|[;&|)])|\s+-(?=$|[;&|)\s]))"
    r"|" + TOKEN_START + r"\.\.(?=$|[/\\\s\"';&|)])"  # a `..` path segment at a token start…
    r"|(?<=[/\\])\.\.(?=$|[/\\\s\"';&|)])"  # …or after a separator
)


def _linked_worktree_root(cwd: str | None) -> Path | None:
    """The directory holding the nearest `.git` when that `.git` is a linked worktree's file, else None.

    No subprocess (this runs on shell calls). A `.git` directory, a submodule gitdir, or an
    unreadable/absent cwd all give None.
    """
    if not cwd:
        return None
    try:
        start = Path(cwd)
        for directory in (start, *start.parents):
            git_entry = directory / ".git"
            if git_entry.is_dir():
                return None
            if git_entry.is_file():
                match = GITDIR_LINE_PATTERN.search(git_entry.read_text(encoding="utf-8"))
                if match and WORKTREES_SEGMENT_PATTERN.search(match.group(1)):
                    return directory
                return None
    except (OSError, UnicodeDecodeError, ValueError):
        return None
    return None


def _prefix_forms(directory: str) -> tuple[str, ...]:
    """A directory as given and fully resolved (macOS /var -> /private/var), '/'-normalised."""
    forms = {directory, os.path.realpath(directory)}
    return tuple(form.replace("\\", "/").rstrip("/") for form in forms)


def _is_under(path: str, directories: tuple[str, ...]) -> bool:
    candidates = {path.replace("\\", "/"), os.path.realpath(path).replace("\\", "/")}
    return any(
        candidate == directory or candidate.startswith(directory + "/")
        for candidate in candidates
        for directory in directories
        if directory
    )


def _first_escaping_path(command: str, worktree_root: Path, scratchpad_dir: str | None) -> str | None:
    """The first path token in `command` outside the worktree root and the scratchpad, else None."""
    always_outside = ALWAYS_OUTSIDE_PATTERN.search(command)
    if always_outside:
        return always_outside.group(0)
    allowed = _prefix_forms(str(worktree_root)) + (_prefix_forms(scratchpad_dir) if scratchpad_dir else ())
    for pattern in (ABSOLUTE_POSIX_PATH_PATTERN, WINDOWS_DRIVE_PATH_PATTERN):
        for match in pattern.finditer(command):
            path = match.group(1)
            if path != DEV_NULL and not _is_under(path, allowed):
                return path
    return None


# --- UNRELIABLE_MEASUREMENTS: warn-only (compiled regex, advice) rows -------------

CR_GREP_PATTERN = re.compile(r"""\bgrep\b[^\n|;&]*(?:\$['"]\\r['"]|['"]\\r['"])""")  # grep for $'\r' or a quoted \r
CR_GREP_ADVICE = (
    "grep for $'\\r' is unreliable on this machine's Git Bash (it returned the line count). "
    "Measure line endings with `git ls-files --eol <path>` or a byte count "
    "(`python -c \"import pathlib;b=pathlib.Path(p).read_bytes();print(b.count(b'\\r\\n'))\"`)."
)
UNRELIABLE_MEASUREMENTS = (
    (CR_GREP_PATTERN, CR_GREP_ADVICE),
)


# --- per-role decisions ------------------------------------------------------

def _decide_team_lead(
    tool_name: str,
    tool_input: dict,
    role: str = "team-lead",
    blocked_factory_job: frozenset = TEAM_LEAD_AGENT_BLOCKED_FACTORY_JOB,
) -> Decision | None:
    if tool_name in WRITE_TOOL_NAMES:
        return Decision(
            "deny",
            f"team-lead never writes files; see {RULE_FILE} — send the change to an engineer",
        )
    if tool_name not in SHELL_TOOL_NAMES:
        return None

    command = _shell_command(tool_input)
    write_match = _matched_write_pattern(command)
    if write_match:
        return Decision(
            "deny",
            f"team-lead never writes files (matched: {write_match}); see {RULE_FILE} — "
            "send the change to an engineer",
        )
    git_match = _matched_git_pattern(command)
    if git_match:
        return Decision(
            "deny",
            f"team-lead never runs state-changing git (matched: git {git_match}); see {RULE_FILE} "
            "— integration is the tech lead's job",
        )
    return _factory_tool_denial(command, role, blocked_factory_job)


def _decide_engineer(
    tool_name: str, tool_input: dict, cwd: str | None = None, scratchpad_dir: str | None = None
) -> Decision | None:
    if tool_name not in SHELL_TOOL_NAMES:
        return None
    command = _shell_command(tool_input)
    git_match = _matched_git_pattern(command)
    if git_match:
        return Decision(
            "deny",
            f"engineer never runs state-changing git (matched: git {git_match}); see {RULE_FILE} "
            "— report the diff to your lead/tech lead for integration",
        )
    write_match = _matched_write_pattern(command)
    if write_match:
        worktree_root = _linked_worktree_root(cwd)  # computed only after a write matched
        escaped = _first_escaping_path(command, worktree_root, scratchpad_dir) if worktree_root else None
        if worktree_root is None or escaped is not None:
            where = (
                f"; in the worktree {worktree_root} but path `{escaped}` is outside it"
                if escaped is not None
                else ""
            )
            return Decision(
                "deny",
                "engineer changes files with the Edit and Write tools only, never through a shell "
                f"(matched: {write_match}{where}); see {RULE_FILE} — redo the change with Edit or Write",
            )
    return _factory_tool_denial(command, "engineer", ENGINEER_BLOCKED_FACTORY_JOB)


def _marker_path(payload: dict) -> Path:
    session_id = payload.get("session_id") or "unknown"
    base_dir = payload.get("scratchpad_dir") or tempfile.gettempdir()
    return Path(base_dir) / f"role_gate_{session_id}.seen"


def _already_warned(payload: dict) -> bool:
    try:
        return _marker_path(payload).exists()
    except OSError:
        return False


def _mark_warned(payload: dict) -> None:
    try:
        marker = _marker_path(payload)
        marker.parent.mkdir(parents=True, exist_ok=True)
        marker.write_text("", encoding="utf-8")
    except OSError:
        pass  # best-effort: a missed marker only costs a second warn, never a security gap


def _decide_tech_lead(tool_name: str, payload: dict) -> Decision | None:
    if tool_name not in WRITE_TOOL_NAMES:
        return None  # the tech lead is never denied, including on Bash
    if _already_warned(payload):
        return None
    _mark_warned(payload)
    return Decision("warn", TECH_LEAD_WARN_TEXT)


def _unreliable_measurement_warning(payload: dict) -> Decision | None:
    """Warn when a shell command uses a measurement known to be wrong on this machine."""
    if payload.get("tool_name") not in SHELL_TOOL_NAMES:
        return None
    command = _shell_command(payload.get("tool_input", {}) or {})
    for pattern, advice in UNRELIABLE_MEASUREMENTS:
        if pattern.search(command):
            return Decision("warn", advice)
    return None


def decide(payload: dict) -> Decision | None:
    """PreToolUse payload -> Decision, or None to stay silent.

    A role decision wins; only when it is silent does the unreliable-measurement warn apply,
    for the pyramid roles and the main session alike.
    """
    if not isinstance(payload, dict):
        return None
    role_decision = _decide_by_role(payload)
    if role_decision is not None:
        return role_decision
    agent_type = payload.get("agent_type")
    if agent_type in (None, "team-lead") or agent_type in ENGINEER_AGENT_TYPES:
        return _unreliable_measurement_warning(payload)
    return None


def _decide_by_role(payload: dict) -> Decision | None:
    """Pure for team-lead/engineer/other; for the absent (tech-lead) case, a first-write Decision
    also records a once-per-session marker file so the warn fires only once — see
    `_mark_warned`. Calling this twice with the same session_id is intentional (tests rely on
    it) and is how the "warn once" behavior is verified.
    """
    agent_type = payload.get("agent_type")
    tool_name = payload.get("tool_name", "") or ""
    tool_input = payload.get("tool_input", {}) or {}

    if agent_type == "team-lead":
        return _decide_team_lead(tool_name, tool_input)
    if agent_type in ENGINEER_AGENT_TYPES:
        return _decide_engineer(tool_name, tool_input, payload.get("cwd"), payload.get("scratchpad_dir"))
    if agent_type is None:
        if os.environ.get(FACTORY_ROLE_ENV) == FACTORY_ROLE_TEAM_LEAD:
            return _decide_team_lead(
                tool_name, tool_input, "FACTORY_ROLE team-lead session", FACTORY_SESSION_BLOCKED_FACTORY_JOB
            )
        return _decide_tech_lead(tool_name, payload)
    return None  # an agent_type outside the pyramid (e.g. "Explore"): not this hook's concern


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

    decision = decide(payload)
    if decision is None:
        return

    sys.exit(_emit(decision))


if __name__ == "__main__":
    main()
