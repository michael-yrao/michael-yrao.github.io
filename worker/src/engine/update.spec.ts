import { describe, expect, it } from 'vitest';
import {
  classify,
  latestTag,
  nextManifest,
  parseManifest,
  planUpdate,
  type Tag,
  type TreeMap,
  type Verdict,
} from './update';

const FILE = '100644';
const EXEC = '100755';

function tree(entries: Record<string, string>, mode: string = FILE): TreeMap {
  return new Map(Object.entries(entries).map(([path, sha]) => [path, { sha, mode }]));
}

function tag(name: string): Tag {
  return { name, commitOid: `${name}-commit`, treeOid: `${name}-tree` };
}

describe('classify', () => {
  const cases: ReadonlyArray<[string, string | null, string | null, string | null, Verdict]> = [
    ['in step', 'a', 'a', 'a', 'unchanged'],
    ['in step despite stale baseline', 'b', 'b', 'a', 'unchanged'],
    ['untouched, upstream moved', 'a', 'b', 'a', 'update'],
    ['upstream added it', null, 'b', null, 'new'],
    ['you edited, upstream still', 'b', 'a', 'a', 'keep-local'],
    ['both moved', 'b', 'c', 'a', 'conflict'],
    ['upstream dropped it', 'a', null, 'a', 'removed-upstream'],
  ];
  it.each(cases)('%s', (_label, local, upstream, baseline, want) => {
    expect(classify(local, upstream, baseline)).toBe(want);
  });
});

describe('planUpdate', () => {
  it('never writes or lists a deny path, even when it differs and is untouched', () => {
    const plan = planUpdate(
      {
        local: tree({ 'cse.config.yml': 'a' }),
        upstream: tree({ 'cse.config.yml': 'b' }),
        baseline: tree({ 'cse.config.yml': 'a' }),
      },
      new Set(['cse.config.yml']),
      true,
    );
    expect(plan).toMatchObject({ write: [], skipped: [], removedUpstream: [] });
  });

  it('lists a learner-only path as removed upstream', () => {
    const plan = planUpdate(
      { local: tree({ 'old.py': 'a' }), upstream: tree({}), baseline: tree({ 'old.py': 'a' }) },
      new Set(['old.py']),
      true,
    );
    expect(plan.removedUpstream).toEqual(['old.py']);
    expect(plan.write).toEqual([]);
  });

  it('withholds workflow files without permission but writes composite actions', () => {
    const workflow = '.github/workflows/fold-attempts.yml';
    const action = '.github/actions/engine-setup/action.yml';
    const plan = planUpdate(
      {
        local: tree({ [workflow]: 'a', [action]: 'a' }),
        upstream: tree({ [workflow]: 'b', [action]: 'b' }),
        baseline: tree({ [workflow]: 'a', [action]: 'a' }),
      },
      new Set([workflow, action]),
      false,
    );
    expect(plan.write).toEqual([{ path: action, mode: FILE }]);
    expect(plan.withheldWorkflows).toBe(true);
  });

  it('keeps the upstream mode for a written file', () => {
    const hook = '.githooks/pre-commit';
    const plan = planUpdate(
      { local: tree({}), upstream: tree({ [hook]: 'b' }, EXEC), baseline: tree({}) },
      new Set([hook]),
      true,
    );
    expect(plan.write).toEqual([{ path: hook, mode: EXEC }]);
  });
});

describe('latestTag', () => {
  const cases: ReadonlyArray<[string, readonly string[], string | null]> = [
    ['unparseable name skipped', ['latest', 'v0.9.0'], 'v0.9.0'],
    ['pre-release skipped', ['v0.9.0', 'v0.11.0-rc1'], 'v0.9.0'],
    ['numeric not lexical order', ['v0.9.0', 'v0.10.1', 'v0.10.0'], 'v0.10.1'],
    ['empty list', [], null],
  ];
  it.each(cases)('%s', (_label, names, want) => {
    expect(latestTag(names.map(tag))?.name ?? null).toBe(want);
  });
});

describe('nextManifest', () => {
  it('serializes like json.dumps(indent=2, sort_keys=True) with the tag commit as upstream_sha', () => {
    const template = parseManifest(
      JSON.stringify({
        files: { 'b.py': 'hash-b', 'a.py': 'hash-a' },
        synced_at: '2026-01-01',
        upstream: 'owner/cse-coach',
        upstream_sha: 'old',
        version: '0.10.1',
      }),
    );
    expect(template).not.toBeNull();
    const text = nextManifest(template!, {
      version: '0.11.0',
      tagCommitOid: 'abc123',
      syncedAt: '2026-10-20',
    });
    expect(text).toBe(
      [
        '{',
        '  "files": {',
        '    "a.py": "hash-a",',
        '    "b.py": "hash-b"',
        '  },',
        '  "synced_at": "2026-10-20",',
        '  "upstream": "owner/cse-coach",',
        '  "upstream_sha": "abc123",',
        '  "version": "0.11.0"',
        '}',
        '',
      ].join('\n'),
    );
  });
});
