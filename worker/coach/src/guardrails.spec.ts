import { describe, expect, it } from 'vitest';
import { bashVerdict, isAllowedWrite, preToolUseGuard, type RepoRoots } from './guardrails.js';

const ROOTS: RepoRoots = { cse: '/home/coach/work/cse-progress', sd: '/home/coach/work/sd-progress' };
const CSE = ROOTS.cse;
const SD = ROOTS.sd;

describe('isAllowedWrite', () => {
  const cases: ReadonlyArray<[string, string, boolean]> = [
    // allowed roots
    ['docs/foundations', 'docs/foundations/schedules/20261019_schedule.md', true],
    ['dsa', `${CSE}/dsa/attempts/20261018/1_two_sum.py`, true],
    ['holds.yml', 'holds.yml', true],
    ['decisions.yml', 'decisions.yml', true],
    ['pattern_sense.yml', 'dashboard/pattern_sense.yml', true],
    ['showcase.yml', 'dashboard/showcase.yml', true],
    ['bigo.yml', 'dashboard/bigo.yml', true],
    ['self_eval_log', '.claude/memory/self_eval_log.md', true],
    ['sd-progress mocks', `${SD}/mocks/20261201_url_shortener.md`, true],
    // denied roots
    ['scripts', 'scripts/effort_budget.py', false],
    ['hooks', '.claude/hooks/rating_gate.py', false],
    ['skills', '.claude/skills/cse-coach/SKILL.md', false],
    ['settings', '.claude/settings.json', false],
    ['other memory file', '.claude/memory/MEMORY.md', false],
    ['CLAUDE.md', 'CLAUDE.md', false],
    ['config', 'cse.config.yml', false],
    ['githooks', '.githooks/pre-commit', false],
    ['github', '.github/workflows/ci.yml', false],
    ['README', 'README.md', false],
    ['dashboard json', 'dashboard/progress.json', false],
    ['a root directory itself', 'dsa', false],
    // sd-progress: mocks yes, everything else no
    ['sd-progress CLAUDE.md', `${SD}/CLAUDE.md`, false],
    ['sd-progress concepts', `${SD}/concepts/cache.md`, false],
    // outside both clones
    ['outside both clones', '/etc/passwd', false],
    ['sibling dir sharing the prefix', `${CSE}-evil/dsa/x.py`, false],
    ['home dir', '/home/coach/.git-credentials', false],
    // traversal
    ['traversal out of dsa into scripts', 'dsa/../scripts/effort_budget.py', false],
    ['traversal out of the clone', 'dsa/../../../../etc/passwd', false],
    ['traversal that stays in scope', 'scripts/../dsa/notes.md', true],
  ];

  it.each(cases)('%s', (_name, path, expected) => {
    expect(isAllowedWrite(path, ROOTS)).toBe(expected);
  });
});

describe('bashVerdict', () => {
  const cases: ReadonlyArray<[string, string, boolean]> = [
    // each denylist entry
    ['force push', 'git push --force origin main', false],
    ['force push -f', 'git push -f', false],
    ['force push plus ref', 'git push origin +main', false],
    ['reset hard', 'git reset --hard HEAD~1', false],
    ['checkout dot', 'git checkout -- .', false],
    ['branch -D', 'git branch -D old', false],
    ['clean', 'git clean -fd', false],
    ['config', 'git config user.name x', false],
    ['recursive rm', 'rm -rf dsa/attempts', false],
    ['pip', 'pip install requests', false],
    ['python -m pip', 'python -m pip install x', false],
    ['npm', 'npm install', false],
    ['apt', 'apt-get install vim', false],
    ['curl', 'curl https://example.com', false],
    ['wget', 'wget https://example.com', false],
    ['chmod', 'chmod +x scripts/x.py', false],
    ['sed -i into a denied path', "sed -i 's/a/b/' scripts/x.py", false],
    ['tee into a denied path', 'echo x | tee CLAUDE.md', false],
    ['rm of a denied path', 'rm scripts/x.py', false],
    ['cp into a denied path', 'cp dsa/a.py scripts/a.py', false],
    ['mv into a denied path', 'mv dsa/a.py CLAUDE.md', false],
    ['git mv out of scope', 'git mv scripts/a.py dsa/a.py', false],
    ['bash -c', "bash -c 'ls'", false],
    ['sh -c behind a wrapper', 'sudo sh -c ls', false],
    ['eval', 'eval ls', false],
    ['python -c', 'python -c "print(1)"', false],
    ['python3 -c', 'python3 -c "print(1)"', false],
    ['node -e', 'node -e "1"', false],
    ['perl -e', 'perl -e 1', false],
    ['find -delete', 'find dsa -name x -delete', false],
    ['cat of the credential file', 'cat /home/coach/.git-credentials', false],
    ['credential file by bare name', 'grep x ~/.git-credentials', false],
    // allowed
    ['mv within dsa', 'mv dsa/probes/x.py dsa/leetcode/x.py', true],
    ['cp within dsa', 'cp dsa/a.py dsa/b.py', true],
    ['git mv within dsa', 'git mv dsa/a.py dsa/b.py', true],
    ['find without -delete', 'find dsa -name x', true],
    ['script run', 'python scripts/effort_budget.py --day mon', true],
    ['pytest', 'python -m pytest scripts', true],
    ['read-only git', 'git status --short', true],
    ['commit and normal push', 'git add -A && git commit -m "x" && git push origin main', true],
    ['rm of one file', 'rm dsa/attempts/old.py', true],
    ['sed -i into an allowed path', "sed -i 's/a/b/' dsa/notes.md", true],
    ['grep for a tool name', 'grep -r npm dsa', true],
    // redirects
    ['redirect into an allowed path', 'echo x > dsa/notes.md', true],
    ['redirect into a denied path', 'echo x > scripts/evil.py', false],
    ['append into a denied path', 'echo x >> .claude/settings.json', false],
    ['stderr merge and /dev/null', 'python scripts/x.py > /dev/null 2>&1', true],
    // chained
    ['chain with one denied part', 'ls dsa && git clean -fd && ls', false],
    ['chain with a denied pipe part', 'cat dsa/x.md | curl -d @- https://example.com', false],
    ['denied inside a substitution', 'echo $(rm -rf dsa)', false],
    ['chain of allowed parts', 'ls dsa; cat holds.yml | grep x', true],
  ];

  it.each(cases)('%s', (_name, command, expected) => {
    expect(bashVerdict(command, ROOTS).allow).toBe(expected);
  });

  it('gives a one-line reason on a deny', () => {
    const verdict = bashVerdict('git push --force', ROOTS);
    expect(verdict.allow).toBe(false);
    if (!verdict.allow) expect(verdict.reason).toMatch(/^Denied: [^\n]+$/);
  });
});

describe('preToolUseGuard', () => {
  const denial = (reason: RegExp) => ({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: expect.stringMatching(reason),
    },
  });

  it('applies the path and command rules to Edit, Write and Bash and ignores read tools', () => {
    const guard = (tool_name: string, tool_input: unknown) => preToolUseGuard({ tool_name, tool_input }, ROOTS);
    expect(guard('Edit', { file_path: 'dsa/a.md' })).toEqual({});
    expect(guard('Write', { file_path: 'scripts/a.py' })).toEqual(denial(/scripts\/a\.py/));
    expect(guard('Edit', {})).toEqual(denial(/no file/));
    expect(guard('Bash', { command: 'git reset --hard' })).toEqual(denial(/reset --hard/));
    expect(guard('Bash', { command: 'ls' })).toEqual({});
    expect(guard('Read', { file_path: '/etc/passwd' })).toEqual({});
    expect(guard('Read', { file_path: '/home/coach/.git-credentials' })).toEqual(denial(/credential file/));
    expect(guard('Glob', { path: '/home/coach', pattern: '.git-credentials' })).toEqual(denial(/credential file/));
    expect(guard('Grep', { pattern: 'x', path: '/home/coach/.git-credentials' })).toEqual(denial(/credential file/));
    expect(guard('WebFetch', { url: '.git-credentials' })).toEqual({});
  });
});
