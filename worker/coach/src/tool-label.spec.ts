import { describe, expect, it } from 'vitest';
import { toolLabel } from './tool-label.js';

describe('toolLabel', () => {
  const cases: ReadonlyArray<[string, string, unknown, string]> = [
    ['script run', 'Bash', { command: 'python scripts/effort_budget.py --day mon' }, 'Ran effort_budget.py'],
    ['commit', 'Bash', { command: 'git add -A && git commit -m "x"' }, 'Committed'],
    ['push', 'Bash', { command: 'git push origin main' }, 'Pushed'],
    ['pytest', 'Bash', { command: 'python -m pytest scripts' }, 'Ran tests'],
    ['other command', 'Bash', { command: 'ls dsa' }, 'Ran a command'],
    ['edit', 'Edit', { file_path: '/home/coach/work/cse-progress/dsa/dsa_progress.md' }, 'Edited dsa_progress.md'],
    ['write', 'Write', { file_path: 'dsa/attempts/20261018/1_two_sum.py' }, 'Wrote 1_two_sum.py'],
    ['read', 'Read', { file_path: '.claude/skills/cse-coach/SKILL.md' }, 'Read SKILL.md'],
    ['glob', 'Glob', { pattern: '**/*.py' }, 'Searched'],
    ['grep', 'Grep', { pattern: 'x' }, 'Searched'],
    ['skill', 'Skill', { skill: 'scheduling' }, 'Skill scheduling'],
    ['web fetch', 'WebFetch', { url: 'https://leetcode.com/problems/two-sum/' }, 'leetcode.com'],
    ['bad web url', 'WebFetch', { url: 'nope' }, 'a page'],
    ['unknown tool', 'Mystery', {}, 'Mystery'],
    ['missing input', 'Read', undefined, 'Read'],
  ];

  it.each(cases)('labels %s', (_name, tool, input, expected) => {
    expect(toolLabel(tool, input)).toBe(expected);
  });
});
