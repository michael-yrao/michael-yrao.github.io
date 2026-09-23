import { computeGroundedness, groundednessOf } from './groundedness';
import { AlgorithmMeta, Step } from '../models/algorithm.model';
import { ShowcaseData, ShowcaseEntry } from '../models/showcase.model';

const ARRAY_STATE = { type: 'array' as const, cells: [], pointers: [] };

function makeStep(overrides: Partial<Step> = {}): Step {
  return { explanation: '', state: ARRAY_STATE, ...overrides };
}

function makeMeta(overrides: Partial<AlgorithmMeta> = {}): AlgorithmMeta {
  return {
    id: 'flood-fill',
    lcNumber: 733,
    title: 'Flood Fill',
    difficulty: 'Medium',
    category: 'graphs',
    tags: [],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    description: '',
    examples: [],
    constraints: [],
    hint: '',
    solutions: [],
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ShowcaseEntry> = {}): ShowcaseEntry {
  return {
    key: '733:bfs',
    lcNumber: 733,
    variant: 'bfs',
    title: 'Flood Fill',
    url: null,
    file: 'dsa/leetcode/graphs/733_flood_fill.py',
    symbol: 'floodFill_20260729',
    attemptDate: '2026-07-29',
    segments: [
      {
        kind: 'attempt',
        symbol: 'floodFill_20260729',
        startLine: 1,
        endLine: 2,
        lines: ['while queue:', 'return image'],
      },
    ],
    ...overrides,
  };
}

function makeShowcase(entries: ShowcaseEntry[] = [makeEntry()]): ShowcaseData {
  return { schemaVersion: 1, generatedAt: '2026-09-22', entries };
}

describe('groundednessOf', () => {
  it('is grounded when every step anchor resolves against the showcase entry', () => {
    const meta = makeMeta();
    const variant = {
      label: 'BFS',
      variant: 'bfs',
      generateSteps: () => [makeStep({ anchor: { match: 'while queue' } })],
    };

    const result = groundednessOf(meta, variant, makeShowcase());

    expect(result).toEqual({ isGrounded: true, isLegacy: false, failures: [] });
  });

  it('is legacy, not a failure, when the variant has no id', () => {
    const meta = makeMeta();
    const variant = { label: 'BFS', variant: '', generateSteps: () => [] };

    const result = groundednessOf(meta, variant, makeShowcase());

    expect(result).toEqual({ isGrounded: false, isLegacy: true, failures: [] });
  });

  it('fails with "no showcase entry for <key>" when the entry is missing', () => {
    const meta = makeMeta();
    const variant = { label: 'DFS', variant: 'dfs', generateSteps: () => [] };

    const result = groundednessOf(meta, variant, makeShowcase());

    expect(result).toEqual({
      isGrounded: false,
      isLegacy: false,
      failures: ['no showcase entry for 733:dfs'],
    });
  });

  it('names the step index and anchor when a step anchor fails to resolve', () => {
    const meta = makeMeta();
    const variant = {
      label: 'BFS',
      variant: 'bfs',
      generateSteps: () => [makeStep({ anchor: { match: 'while stack' } })],
    };

    const result = groundednessOf(meta, variant, makeShowcase());

    expect(result.isGrounded).toBe(false);
    expect(result.failures).toEqual([
      "step 0: anchor 'while stack' — no line matches 'while stack'",
    ]);
  });
});

describe('computeGroundedness', () => {
  it('counts total/grounded/legacy and computes the ratio', () => {
    const meta = makeMeta({
      solutions: [
        {
          label: 'BFS',
          variant: 'bfs',
          generateSteps: () => [makeStep({ anchor: { match: 'while queue' } })],
        },
        { label: 'DFS', variant: '', generateSteps: () => [] }, // legacy: no variant id
      ],
    });

    const report = computeGroundedness([meta], makeShowcase());

    expect(report.total).toBe(2);
    expect(report.grounded).toBe(1);
    expect(report.legacy).toBe(1);
    expect(report.ratio).toBe(0.5);
    expect(report.failures).toEqual([]);
  });

  it('collects failures across algorithms, keyed by showcase key', () => {
    const meta = makeMeta({
      solutions: [{ label: 'DFS', variant: 'dfs', generateSteps: () => [] }],
    });

    const report = computeGroundedness([meta], makeShowcase());

    expect(report.failures).toEqual([{ key: '733:dfs', reason: 'no showcase entry for 733:dfs' }]);
  });

  it('ratio is 0 when there are no variants at all', () => {
    const report = computeGroundedness([], makeShowcase([]));

    expect(report.total).toBe(0);
    expect(report.ratio).toBe(0);
  });
});
