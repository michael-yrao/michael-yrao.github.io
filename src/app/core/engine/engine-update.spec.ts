import { EngineUpdate, EngineVersions, engineUpdate, engineVersions, isNewerVersion } from './engine-update';

interface VersionCase {
  readonly name: string;
  readonly candidate: string;
  readonly current: string;
  readonly expected: boolean;
}

describe('isNewerVersion', () => {
  it.each<VersionCase>([
    { name: 'a v prefix is ignored', candidate: 'v0.11.0', current: '0.10.1', expected: true },
    { name: 'a pre-release suffix is stripped, so equal', candidate: '0.11.0-rc1', current: '0.11.0', expected: false },
    { name: 'a longer version beats its shorter prefix', candidate: '0.11.0', current: '0.11', expected: true },
    { name: 'a shorter prefix is not newer', candidate: '0.11', current: '0.11.0', expected: false },
    { name: 'equal is not newer', candidate: '0.10.1', current: '0.10.1', expected: false },
    { name: 'older is not newer', candidate: '0.10.0', current: '0.10.1', expected: false },
    { name: 'unparseable is not newer', candidate: 'main', current: '0.10.1', expected: false },
  ])('$name', ({ candidate, current, expected }) => {
    expect(isNewerVersion(candidate, current)).toBe(expected);
  });
});

const FULL: EngineUpdate = {
  version: { repo: '0.10.1', template: '0.11.0' },
  updated: ['a'],
  skipped: [{ path: 'scripts/x.py', reason: 'conflict' }],
  removedUpstream: ['old.py'],
  notice: 'needs-workflows-permission',
};

interface ParseCase {
  readonly name: string;
  readonly payload: unknown;
  readonly expected: EngineUpdate | null;
}

describe('engineUpdate', () => {
  it.each<ParseCase>([
    { name: 'a valid full body is parsed', payload: FULL, expected: FULL },
    { name: 'a missing version is null', payload: { ...FULL, version: undefined }, expected: null },
    { name: 'updated that is not a string array is null', payload: { ...FULL, updated: 'a' }, expected: null },
    {
      name: 'a skipped reason outside conflict/keep-local is null',
      payload: { ...FULL, skipped: [{ path: 'x', reason: 'other' }] },
      expected: null,
    },
  ])('$name', ({ payload, expected }) => {
    expect(engineUpdate(payload)).toEqual(expected);
  });
});

describe('engineVersions', () => {
  it('reads only the version pair', () => {
    const expected: EngineVersions = { repo: '0.10.1', template: null };
    expect(engineVersions({ version: { repo: '0.10.1', template: null } })).toEqual(expected);
  });
});
